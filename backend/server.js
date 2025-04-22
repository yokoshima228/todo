const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Agenda = require('agenda');
const sendEmail = require('./utils/mailer');
const logger = require('./utils/logger');
const metrics = require('./utils/metrics');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Создаем папку для логов, если она не существует
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

/**
 * @swagger
 * components:
 *  schemas:
 *    Todo:
 *      type: object
 *      properties:
 *        _id:
 *          type: string
 *        title:
 *          type: string
 *        completed:
 *          type: boolean
 *        dueDate:
 *          type: Date
 *          format: date
 *        priority:
 *          type: string
 *          enum: ['low', 'medium', 'high']
 *        notes:
 *          type: string
 *        tags:
 *          type: array
 *        owner:
 *          type: number
 *        order:
 *          type: number
 *        createdAt:
 *          type: Date
 *          format: date
 *        updatedAt:
 *          type: Date
 *          format: date
 *    User:
 *      type: object
 *      properties:
 *        _id:
 *          type: string
 *        email:
 *          type: string
 *        createdAt:
 *          type: Date
 *          format: date
 *        updatedAt:
 *          type: Date
 *          format: date
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Конфигурация Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Todo API',
      version: '1.0.0',
      description: 'Документация для Todo API'
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5000}` }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  },
  apis: ['./server.js']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();

app.use(cors());
app.use(express.json());

// Логирование HTTP запросов
app.use(logger.httpLogger);

// Сбор метрик HTTP запросов
app.use(metrics.httpMetricsMiddleware);

// Маршрут для Prometheus метрик
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).end();
  }
});

// Маршрут для Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' } });

agenda.define('send due date email', { priority: 'high', concurrency: 10 }, async (job) => {
    const { todoId, userEmail, todoTitle, dueDate } = job.attrs.data;
    console.log(`Processing job 'send due date email' for todo ${todoId}`);
    try {
        const subject = `Напоминание: Срок задачи "${todoTitle}" скоро истекает!`;
        const html = `
            <p>Здравствуйте!</p>
            <p>Напоминаем, что срок выполнения вашей задачи <b>${todoTitle}</b> истекает ${new Date(dueDate).toLocaleString('ru-RU')}.</p>
            <p>Не забудьте ее завершить!</p>
            <p>С уважением,<br/>Ваше Todo Приложение</p>
        `;
        const text = `Здравствуйте! Напоминаем, что срок выполнения вашей задачи "${todoTitle}" истекает ${new Date(dueDate).toLocaleString('ru-RU')}. Не забудьте ее завершить! С уважением, Ваше Todo Приложение`;

        await sendEmail({
            to: userEmail,
            subject: subject,
            text: text,
            html: html
        });
        console.log(`Reminder email sent for todo ${todoId} to ${userEmail}`);
    } catch (error) {
        console.error(`Failed to send reminder email for todo ${todoId}:`, error);
    }
});

// Определяем задачу для обновления метрики активных пользователей
agenda.define('update-active-users-count', async (job) => {
    try {
        logger.info('Running update-active-users-count job');
        
        // Вычисляем дату 7 дней назад
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Находим пользователей с активностью за последние 7 дней
        // Это примерный подход - в реальном приложении вы могли бы отслеживать 
        // последнюю активность в отдельном поле в таблице пользователей
        const activeUserIds = await Todo.aggregate([
            {
                $match: {
                    $or: [
                        { createdAt: { $gte: sevenDaysAgo } },
                        { updatedAt: { $gte: sevenDaysAgo } }
                    ]
                }
            },
            {
                $group: {
                    _id: "$owner"
                }
            }
        ]);
        
        const activeUsersCount = activeUserIds.length;
        
        // Обновляем метрику
        metrics.setActiveUsers(activeUsersCount);
        logger.info('Active users count updated', { count: activeUsersCount });
    } catch (error) {
        logger.error('Error updating active users count', { error: error.message });
        metrics.incrementError('active_users_count_update_failed', error.message);
    }
});

async function startAgenda() {
    await agenda.start();
    logger.info('Agenda started processing jobs.');
    
    // Запускаем задачу проверки сроков каждый день в 9:00 утра
    await agenda.every('0 9 * * *', 'check-due-dates');
    logger.info('Due date checker scheduled to run daily at 9:00 AM');
    
    // Запускаем задачу подсчета активных пользователей каждые 24 часа
    await agenda.every('0 0 * * *', 'update-active-users-count');
    logger.info('Active users counter scheduled to run daily at midnight');
}

// Определяем задачу проверки задач с истекающим сроком
agenda.define('check-due-dates', async (job) => {
    console.log('Running check-due-dates job');
    
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Находим все задачи, срок которых истекает в течение следующих 24 часов
        const upcomingTodos = await Todo.find({
            dueDate: { 
                $gte: today,
                $lte: tomorrow 
            },
            completed: false
        }).populate('owner');
        
        console.log(`Found ${upcomingTodos.length} todos with upcoming due dates`);
        
        // Для каждой задачи планируем отправку уведомления
        for (const todo of upcomingTodos) {
            if (!todo.owner || !todo.owner.email) {
                console.log(`Owner or email missing for todo: ${todo._id}`);
                continue;
            }
            
            // Планируем отправку уведомления
            await agenda.schedule('in 5 minutes', 'send due date email', {
                todoId: todo._id,
                userEmail: todo.owner.email,
                todoTitle: todo.title,
                dueDate: todo.dueDate
            });
            
            console.log(`Scheduled reminder email for todo: ${todo._id} to ${todo.owner.email}`);
        }
    } catch (error) {
        console.error('Error in check-due-dates job:', error);
    }
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        startAgenda();
    })
    .catch((err) => console.log(err));

const todoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false,
    },
    dueDate: {
        type: Date,
        default: null
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    order: {
        type: Number,
        required: true,
        default: 0,
        index: true
    }
}, { timestamps: true });

const Todo = mongoose.model('Todo', todoSchema);

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

const User = mongoose.model('User', userSchema);

// Middleware для аутентификации
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded._id) {
            throw new Error('Invalid token structure');
        }

        const user = await User.findById(decoded._id);
        if (!user) {
            throw new Error('User not found');
        }

        req.user = user;
        req.token = token;
        next();

    } catch (error) {
        logger.warn('Authentication failed', { 
            error: error.message, 
            path: req.path,
            ip: req.ip
        });
        metrics.incrementError('authentication_failed', error.message);
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

/**
 * @swagger
 * tags:
 *  name: Users
 *  description: Управление пользователями
 */

/**
 * @swagger
 * /api/users/register:
 *  post:
 *    summary: Регистрация нового пользователя
 *    tags: [Users]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - email
 *              - password
 *            properties:
 *              email:
 *                type: string
 *                format: email
 *              password:
 *                type: string
 *                minLength: 6
 *    responses:
 *      201:
 *        description: Пользователь успешно зарегистрирован
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                _id:
 *                  type: string
 *                email:
 *                  type: string
 *                createdAt:
 *                  type: Date
 * 
 *      400:
 *        description: Некорректные данные
 */
app.post('/api/users/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = new User({ email, password });
        await user.save();
        
        logger.info('User registered', { email: email });
        res.status(201).json(user);
    } catch (err) {
        logger.error('Registration failed', { error: err.message, email: req.body?.email });
        metrics.incrementError('registration_failed', err.message);
        res.status(400).json({ error: 'Failed to register user', message: err.message });
    }
});

/**
 * @swagger
 * /api/users/login:
 *  post:
 *    summary: Вход пользователя в систему
 *    tags: [Users]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - email
 *              - password
 *            properties:
 *              email:
 *                type: string
 *                format: email
 *              password:
 *                type: string
 *                minLength: 6
 *    responses:
 *      200:
 *        description: Пользователь успешно авторизован
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                user:
 *                  properties:
 *                    _id:
 *                      type: string
 *                    email:
 *                      type: string
 *                token:
 *                  type: string
 * 
 */
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn('Login failed - user not found', { email: email });
            metrics.incrementError('login_failed', 'User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Login failed - incorrect password', { email: email });
            metrics.incrementError('login_failed', 'Incorrect password');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const payload = { _id: user._id };
        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        logger.info('User logged in', { userId: user._id });
        res.json({ 
            user: { _id: user._id, email: user.email },
            token 
        });

    } catch (err) {
        logger.error('Login processing error', { error: err.message, email: req.body?.email });
        metrics.incrementError('login_error', err.message);
        res.status(500).json({ error: 'Failed to login', message: err.message });
    }
});

/**
 * @swagger
 * tags:
 *  name: Todos
 *  description: Управление задачами
 */

/**
 * @swagger
 * /api/todos:
 *  get:
 *    summary: Получение всех задач авторизованного пользователя
 *    tags: [Todos]
 *    security:
 *      - bearerAuth: []
 *    description: Для авторизации используйте токен, полученный при входе в систему. Вставьте его в поле Authorize (значок замка вверху страницы) в формате "Bearer ваш_токен"
 *    responses:
 *      200:
 *        description: Успех
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  _id:
 *                    type: string
 *                  title:
 *                    type: string
 *                  completed:
 *                    type: boolean
 *                  dueDate:
 *                    type: string
 *                    format: date-time
 *                  priority:
 *                    type: string
 *                  notes:
 *                    type: string
 *                  tags:
 *                    type: array
 *                  owner:
 *                    type: string
 *                  order:
 *                    type: number
 *                  createdAt:
 *                    type: string
 *                    format: date-time
 *                  updatedAt:
 *                    type: string
 *                    format: date-time
 *      401:
 *        description: Не авторизован - требуется действительный токен
 *      500:
 *        description: Ошибка сервера
 */
app.get('/api/todos', auth, async (req, res) => {
    try {
        // Находим только задачи, принадлежащие авторизованному пользователю
        // и сортируем их по полю order
        const todos = await Todo.find({ owner: req.user._id }).sort({ order: 1 });
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch todos', message: error.message });
    }
});

/**
 * @swagger
 * /api/todos/:id:
 *  get:
 *    summary: Получение одной задачи по ID (принадлежащей текущему пользователю)
 *    tags: [Todos]
 *    security:
 *      - bearerAuth: []
 *    description: Для авторизации используйте токен, полученный при входе в систему. Вставьте его в поле Authorize (значок замка вверху страницы) в формате "Bearer ваш_токен"
 *    responses:
 *      200:
 *        description: Успех
 *      404:
 *        description: Задача не найдена
 *      500:
 *        description: Ошибка сервера
 */
app.get('/api/todos/:id', auth, async (req, res) => {
    try {
        const _id = req.params.id;
        // Ищем задачу по ID и владельцу
        const todo = await Todo.findOne({ _id, owner: req.user._id });

        if (!todo) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        res.json(todo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get todo', message: error.message });
    }
});

/**
 * @swagger
 * /api/todos:
 *  post:
 *    summary: Создание новой задачи
 *    tags: [Todos]
 *    security:
 *      - bearerAuth: []
 *    description: Для авторизации используйте токен, полученный при входе в систему. Вставьте его в поле Authorize (значок замка вверху страницы) в формате "Bearer ваш_токен"
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - title
 *              - dueDate
 *            properties:
 *              title:
 *                type: string
 *              dueDate:
 *                type: string
 *                format: date-time
 *              priority:
 *                type: string
 *              notes:
 *                type: string
 *              tags:
 *                type: array
 *                items:
 *                  type: string
 *    responses:
 *      201:
 *        description: Задача успешно создана
 *      400:
 *        description: Некорректные данные
 *      500:
 *        description: Ошибка сервера
 */
app.post('/api/todos', auth, async (req, res) => {
    try {
        // Находим максимальное значение order для задач текущего пользователя
        const maxOrderTodo = await Todo.findOne({ owner: req.user._id }).sort({ order: -1 });
        const newOrder = maxOrderTodo ? maxOrderTodo.order + 1 : 0;

        const todo = new Todo({
            ...req.body,
            owner: req.user._id,
            order: newOrder // Устанавливаем новое значение order
        });
        await todo.save();
        
        // Увеличиваем метрику созданных задач
        metrics.incrementTodoCreated();
        logger.info('Todo created', { userId: req.user._id, todoId: todo._id });

        // Если у задачи есть срок выполнения, планируем отправку уведомления
        if (todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            const now = new Date();
            
            // Вычисляем время за сутки до срока
            const notificationDate = new Date(dueDate);
            notificationDate.setDate(notificationDate.getDate() - 1);
            
            // Если срок не сегодня и не прошел, планируем уведомление за день до дедлайна
            if (notificationDate > now) {
                await agenda.schedule(notificationDate, 'send due date email', {
                    todoId: todo._id,
                    userEmail: req.user.email,
                    todoTitle: todo.title,
                    dueDate: todo.dueDate
                });
                logger.info(`Scheduled reminder email`, { todoId: todo._id, dueDate: todo.dueDate });
            }
        }
        
        res.status(201).json(todo);
    } catch (error) {
        // Если ошибка валидации Mongoose
        logger.error('Failed to create todo', { error: error.message, userId: req.user?._id });
        metrics.incrementError('todo_creation_failed', error.message);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation failed', message: error.message });
        }
        res.status(500).json({ error: 'Failed to create todo', message: error.message });
    }
});

app.get('/api/test-notifications', async (req, res) => {
    try {
    await agenda.now('check-due-dates');
    res.json({ message: 'Check due dates job triggered' });
    } catch (error) {
    res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/todos/complete:
 *  delete:
 *    summary: Удаление всех завершенных задач текущего пользователя
 *    tags: [Todos]
 *    security:
 *      - bearerAuth: []
 *    description: Для авторизации используйте токен, полученный при входе в систему. Вставьте его в поле Authorize (значок замка вверху страницы) в формате "Bearer ваш_токен"
 *    responses:
 *      204:
 *        description: Успех
 *      500:
 *        description: Ошибка сервера
 */
app.delete('/api/todos/complete', auth, async (req, res) => {
    try {
        // Находим все завершенные задачи пользователя перед удалением
        const completedTodos = await Todo.find({ completed: true, owner: req.user._id });
        
        // Удаляем все завершенные задачи текущего пользователя
        await Todo.deleteMany({ completed: true, owner: req.user._id });
        
        // Отменяем все запланированные уведомления для удаленных задач
        for (const todo of completedTodos) {
            await agenda.cancel({ 'data.todoId': todo._id.toString() });
            console.log(`Cancelled reminder emails for deleted completed todo ${todo._id}`);
        }
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete completed todos', message: error.message });
    }
});

/**
 * @swagger
 * /api/todos/:id:
 *  delete:
 *    summary: Удаление одной задачи по ID (принадлежащей текущему пользователю)
 *    tags: [Todos]
 *    security:
 *      - bearerAuth: []
 *    description: Для авторизации используйте токен, полученный при входе в систему. Вставьте его в поле Authorize (значок замка вверху страницы) в формате "Bearer ваш_токен"
 *    responses:
 *      204:
 *        description: Успех
 *      404:
 *        description: Задача не найдена
 *      500:
 *        description: Ошибка сервера
 */
app.delete('/api/todos/:id', auth, async (req, res) => {
    try {
        const _id = req.params.id;
        // Ищем и удаляем задачу по ID и владельцу
        const todo = await Todo.findOneAndDelete({ _id, owner: req.user._id });

        if (!todo) {
            logger.warn('Todo not found for deletion', { todoId: _id, userId: req.user._id });
            return res.status(404).json({ error: 'Todo not found' });
        }
        
        // Увеличиваем метрику удаленных задач
        metrics.incrementTodoDeleted();
        logger.info('Todo deleted', { todoId: _id, userId: req.user._id });
        
        // Отменяем все запланированные уведомления для этой задачи
        await agenda.cancel({ 'data.todoId': todo._id.toString() });
        logger.info('Cancelled reminder email', { todoId: _id });
        
        res.status(204).send();
    } catch (error) {
        logger.error('Failed to delete todo', { error: error.message, todoId: req.params.id, userId: req.user._id });
        metrics.incrementError('todo_deletion_failed', error.message);
        
        res.status(500).json({ error: 'Failed to delete todo', message: error.message });
    }
});

/**
 * @swagger
 * /api/todos/reorder:
 *  put:
 *    summary: Обновление порядка задач
 *    tags: [Todos]
 *    security:
 *      - bearerAuth: []
 *    description: Для авторизации используйте токен, полученный при входе в систему. Вставьте его в поле Authorize (значок замка вверху страницы) в формате "Bearer ваш_токен"
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - orderedIds
 *            properties:
 *              orderedIds:
 *                type: array
 *                items:
 *                  type: string
 *    responses:
 *      200:
 *        description: Успех
 *      400:
 *        description: Некорректные данные
 *      500:
 */
app.put('/api/todos/reorder', auth, async (req, res) => {
    console.log('Reorder request received');
    const { orderedIds } = req.body;
    console.log('Ordered IDs:', orderedIds);
    if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'Invalid input: orderedIds must be an array.' });
    }

    try {
        // Создаем массив операций для bulkWrite
        const operations = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id, owner: req.user._id }, // Убеждаемся, что обновляем только задачи пользователя
                update: { $set: { order: index } } // Устанавливаем новый порядок
            }
        }));

        // Выполняем все обновления одним запросом
        const result = await Todo.bulkWrite(operations);

        console.log('Reorder result:', result);

        // Проверяем, были ли модифицированы документы (опционально, для отладки)
        if (result.modifiedCount !== orderedIds.length) {
            console.warn('Not all todos might have been reordered. Possible ID mismatch or ownership issue.');
            // Можно добавить более детальную проверку, если необходимо
        }

        res.status(200).json({ message: 'Todos reordered successfully.' });

    } catch (error) {
        console.error('Failed to reorder todos:', error);
        res.status(500).json({ error: 'Failed to reorder todos', message: error.message });
    }
});

/**
 * @swagger
 * /api/todos/:id:
 *  put:
 *    summary: Обновление одной задачи по ID (принадлежащей текущему пользователю)
 *    tags: [Todos]
 *    security:
 *      - bearerAuth: []
 *    description: Для авторизации используйте токен, полученный при входе в систему. Вставьте его в поле Authorize (значок замка вверху страницы) в формате "Bearer ваш_токен"
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              title:
 *                type: string
 *              completed:
 *                type: boolean
 *              dueDate:
 *                type: string
 *                format: date-time
 *              priority:
 *                type: string
 *              notes:
 *                type: string
 *              tags:
 *                type: array
 *                items:
 *                  type: string
 *    responses:
 *      200:
 *        description: Успех
 *      400:
 *        description: Некорректные данные
 *      404:
 *        description: Задача не найдена
 *      500:
 */
app.put('/api/todos/:id', auth, async (req, res) => {
    try {
        const _id = req.params.id;
        const updates = req.body;
        // ВАЖНО: Запрещаем обновление поля 'order' через этот эндпоинт
        const allowedUpdates = ['title', 'completed', 'dueDate', 'priority', 'notes', 'tags'];
        const requestedUpdates = Object.keys(updates);

        // Ищем и обновляем задачу по ID и владельцу
        const updatedTodo = await Todo.findOneAndUpdate(
            { _id, owner: req.user._id },
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedTodo) {
            logger.warn('Todo not found for update', { todoId: _id, userId: req.user._id });
            return res.status(404).json({ error: 'Todo not found' });
        }

        // Если задача отмечена как выполненная, обновляем метрику
        if (updates.completed === true) {
            metrics.incrementTodoCompleted();
            logger.info('Todo marked as completed', { todoId: _id, userId: req.user._id });
        }

        // Если задача обновлена с новой датой выполнения или отмечена как выполненная
        if (updates.dueDate || updates.completed !== undefined) {
            // Сначала отменяем существующие уведомления для этой задачи
            await agenda.cancel({ 'data.todoId': updatedTodo._id.toString() });
            
            // Если задача не выполнена и имеет срок, планируем новое уведомление
            if (!updatedTodo.completed && updatedTodo.dueDate) {
                const dueDate = new Date(updatedTodo.dueDate);
                const now = new Date();
                
                // Вычисляем время за сутки до срока
                const notificationDate = new Date(dueDate);
                notificationDate.setDate(notificationDate.getDate() - 1);
                
                // Если срок не сегодня и не прошел, планируем уведомление за день до дедлайна
                if (notificationDate > now) {
                    await agenda.schedule(notificationDate, 'send due date email', {
                        todoId: updatedTodo._id,
                        userEmail: req.user.email,
                        todoTitle: updatedTodo.title,
                        dueDate: updatedTodo.dueDate
                    });
                    logger.info('Rescheduled reminder email', { todoId: _id, dueDate: updatedTodo.dueDate });
                }
            }
        }

        res.json(updatedTodo);
    } catch (error) {
        logger.error('Failed to update todo', { error: error.message, todoId: req.params.id, userId: req.user._id });
        metrics.incrementError('todo_update_failed', error.message);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation failed', message: error.message });
        }
        res.status(500).json({ error: 'Failed to update todo', message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Обработка неперехваченных исключений
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.stack });
  metrics.incrementError('uncaught_exception', error.message);
  
  // Даем время на запись логов перед завершением
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: reason instanceof Error ? reason.stack : reason });
  metrics.incrementError('unhandled_rejection', reason instanceof Error ? reason.message : String(reason));
});
