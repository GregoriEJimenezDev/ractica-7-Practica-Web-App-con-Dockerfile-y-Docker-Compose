const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const SERVER_PORT = process.env.PORT || 3000;

// Configuración de la conexión
const credentials = {
  host: process.env.MYSQL_HOST || 'db',
  user: process.env.MYSQL_USER || 'app_user',
  password: process.env.MYSQL_PASSWORD || 'app_password',
  database: process.env.MYSQL_DATABASE || 'hola_mundo_db',
};

/**
  Obtiene la información y registros iniciales desde la base de datos
 */
async function fetchServiceData() {
  const client = await mysql.createConnection(credentials);
  try {
    // Creación de la estructura base
    await client.execute(`
      CREATE TABLE IF NOT EXISTS registry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserción inicial si la tabla está vacía
    const [counts] = await client.execute('SELECT COUNT(*) AS totalEntries FROM registry');
    if (counts[0].totalEntries === 0) {
      await client.execute(
        'INSERT INTO registry (content) VALUES (?)',
        ['Sistema inicializado correctamente con Node.js y MySQL en Docker.']
      );
    }

    // Consulta de datos
    const [entries] = await client.execute('SELECT content FROM registry ORDER BY id ASC LIMIT 1');
    const [systemInfo] = await client.execute('SELECT VERSION() AS version, NOW() AS timestamp, DATABASE() AS name');

    return {
      status: true,
      textMessage: entries[0]?.content || 'Servicio Activo',
      engineVersion: systemInfo[0]?.version,
      currentTimestamp: systemInfo[0]?.timestamp,
      activeSchema: systemInfo[0]?.name,
    };
  } finally {
    await client.end();
  }
}

app.get('/', async (req, res) => {
  let state = {
    status: false,
    textMessage: 'Estableciendo conexión...',
    engineVersion: 'N/A',
    currentTimestamp: 'N/A',
    activeSchema: credentials.database,
    failureReason: null,
  };

  try {
    state = await fetchServiceData();
  } catch (err) {
    state.failureReason = err.message;
  }

  const indicatorClass = state.status ? 'status-online' : 'status-offline';
  const indicatorLabel = state.status
    ? 'Conexión a BD Activa'
    : 'Error al conectar con BD';

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Control - Docker App</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
            background: #0b0f19;
            background-image: radial-gradient(circle at 50% 0%, #1e293b 0%, #0b0f19 75%);
            color: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 24px;
        }
        .card {
            background: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 36px;
            width: 100%;
            max-width: 520px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .header {
            text-align: center;
            margin-bottom: 24px;
        }
        h1 {
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.025em;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .message {
            color: #94a3b8;
            font-size: 1rem;
            line-height: 1.5;
        }
        .status-pill {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
            margin: 20px 0;
        }
        .status-online {
            background-color: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-offline {
            background-color: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .details-grid {
            background: rgba(15, 23, 42, 0.6);
            border-radius: 16px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            font-size: 0.9rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 8px;
        }
        .row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .label {
            color: #64748b;
            font-weight: 500;
        }
        .value {
            color: #e2e8f0;
            font-family: monospace;
        }
        .error-log {
            color: #f87171;
            word-break: break-all;
            margin-top: 8px;
            font-size: 0.85rem;
        }
        .footer {
            text-align: center;
            margin-top: 24px;
            font-size: 0.8rem;
            color: #475569;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>Servidor de Aplicación</h1>
            <p class="message">${state.textMessage}</p>
            <div class="status-pill ${indicatorClass}">${indicatorLabel}</div>
        </div>

        <div class="details-grid">
            <div class="row">
                <span class="label">Entorno</span>
                <span class="value">Node.js ${process.version}</span>
            </div>
            <div class="row">
                <span class="label">Host BD</span>
                <span class="value">${credentials.host}</span>
            </div>
            <div class="row">
                <span class="label">Base de Datos</span>
                <span class="value">${state.activeSchema}</span>
            </div>
            <div class="row">
                <span class="label">Versión BD</span>
                <span class="value">${state.engineVersion}</span>
            </div>
            <div class="row">
                <span class="label">Fecha / Hora BD</span>
                <span class="value">${state.currentTimestamp}</span>
            </div>
            ${state.failureReason ? `<div class="error-log"><strong>Detalle del error:</strong> ${state.failureReason}</div>` : ''}
        </div>

        <div class="footer">
            Entorno contenedorizado | Proyecto de Infraestructura
        </div>
    </div>
</body>
</html>`);
});

app.listen(SERVER_PORT, '0.0.0.0', () => {
  console.log(`[INFO] Aplicación iniciada en el puerto ${SERVER_PORT}`);
});
