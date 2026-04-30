import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema/schema.js';

// Import route registration functions
import * as validateClaimRoutes from './routes/validate-claim.js';
import * as emergencyCheckRoutes from './routes/emergency-check.js';
import * as emergencyNextQuestionRoutes from './routes/emergency-next-question.js';
import * as nutritionMythsRoutes from './routes/nutrition-myths.js';
import * as reviewsRoutes from './routes/reviews.js';
import * as drugInteractionsRoutes from './routes/drug-interactions.js';
import * as funFactsRoutes from './routes/fun-facts.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Register routes - IMPORTANT: Always use registration functions to avoid circular dependency issues
validateClaimRoutes.register(app, app.fastify);
emergencyCheckRoutes.register(app, app.fastify);
emergencyNextQuestionRoutes.register(app, app.fastify);
nutritionMythsRoutes.register(app, app.fastify);
reviewsRoutes.register(app, app.fastify);
drugInteractionsRoutes.register(app, app.fastify);
funFactsRoutes.register(app, app.fastify);

await app.run();
app.logger.info('Application running');
