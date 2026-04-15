import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import mongoose from 'mongoose';
import { typeDefs } from './src/schema/typeDefs.js';
import { resolvers } from './src/resolvers/index.js';
import { buildContext } from './src/context/buildContext.js';

// PORT festlegen
const PORT = process.env.PORT || 4000;

// Express App initialisieren
const app = express();

// Apollo Server initialisieren
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function startServer() {
  // 1. Mit einer lokalen (oder später MongoDB Atlas) Datenbank verbinden
  // Für die Entwicklung nutzen wir hier eine lokale DB namens "verbrauch_dev"
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/verbrauch_dev');
    console.log('✅ Mit MongoDB verbunden');
  } catch (error) {
    console.error('❌ MongoDB Verbindungsfehler:', error);
  }

  // 2. Apollo Server starten
  await server.start();

  // 3. Middlewares einrichten (CORS für das spätere React-Frontend)
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => buildContext(req),
    })
  );

  // 4. Express Server starten (auf allen Interfaces, damit Netzwerkzugriff moeglich ist)
  const listener = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GraphQL: http://localhost:${PORT}/graphql`);
    console.log(`🌐 Im Netz:  http://192.168.178.33:${PORT}/graphql`);
  });

  listener.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} ist bereits belegt.`);
      console.error('💡 Lösung: laufenden Prozess beenden und neu starten');
      console.error(`   lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
      console.error('   kill <PID>');
      return;
    }

    console.error('❌ Server-Start fehlgeschlagen:', error);
  });
}

startServer().catch((error) => {
  console.error('❌ Unerwarteter Fehler beim Start:', error);
});