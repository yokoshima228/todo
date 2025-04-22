const promClient = require('prom-client');
const logger = require('./logger');

// Создаем реестр метрик
const register = new promClient.Registry();

// Добавляем дефолтные метрики Node.js (GC, память, CPU и т.д.)
promClient.collectDefaultMetrics({ register });

// Счетчик HTTP запросов
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

// Гистограмма длительности HTTP запросов
const httpRequestDurationMs = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'path', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register]
});

// Счетчик ошибок
const errorCounter = new promClient.Counter({
  name: 'app_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'message'],
  registers: [register]
});

// Счетчики бизнес-логики
const todosCreatedTotal = new promClient.Counter({
  name: 'todos_created_total',
  help: 'Total number of todos created',
  registers: [register]
});

const todosCompletedTotal = new promClient.Counter({
  name: 'todos_completed_total',
  help: 'Total number of todos completed',
  registers: [register]
});

const todosDeletedTotal = new promClient.Counter({
  name: 'todos_deleted_total',
  help: 'Total number of todos deleted',
  registers: [register]
});

// Количество активных пользователей (gauge - значение, которое может увеличиваться и уменьшаться)
const activeUsersGauge = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users (with recent activity)',
  registers: [register]
});

// Экспортируем метрики и вспомогательные функции
module.exports = {
  // Prometheus registry для endpoint /metrics
  register,
  
  // Middleware для сбора метрик HTTP запросов
  httpMetricsMiddleware: (req, res, next) => {
    const start = Date.now();
    
    // Функция для определения пути с параметрами
    const getRoutePath = () => {
      const route = req.route ? req.route.path : req.path;
      return route.toString().replace(/\//g, '_').replace(/:/g, '').replace(/^\_+/, '');
    };
    
    // При завершении запроса
    res.on('finish', () => {
      const duration = Date.now() - start;
      const path = getRoutePath();
      const method = req.method;
      const status = res.statusCode;
      
      // Увеличиваем счетчик запросов
      httpRequestsTotal.inc({ method, path, status });
      
      // Записываем длительность запроса
      httpRequestDurationMs.observe({ method, path, status }, duration);
      
      // Если ошибка 5xx, увеличиваем счетчик ошибок
      if (status >= 500) {
        errorCounter.inc({ type: 'http_server_error', message: 'Server Error' });
      }
    });
    
    next();
  },
  
  // Функции для бизнес-метрик
  incrementTodoCreated: () => todosCreatedTotal.inc(),
  incrementTodoCompleted: () => todosCompletedTotal.inc(),
  incrementTodoDeleted: () => todosDeletedTotal.inc(),
  
  // Функция для обновления счетчика активных пользователей
  setActiveUsers: (count) => activeUsersGauge.set(count),
  
  // Функция для увеличения счетчика ошибок
  incrementError: (type, message) => {
    errorCounter.inc({ type, message: message.substring(0, 50) });
    logger.error(`Error: ${message}`, { type });
  }
}; 