import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { bootstrapAdmin } from './features/auth/bootstrap';

const bootstrap = async (): Promise<void> => {
    await connectDB();
    await bootstrapAdmin();

    app.listen(env.PORT, () => {
        console.log(`🚀  ECDM Core running on http://localhost:${env.PORT}  [${env.NODE_ENV}]`);
    });
};

bootstrap();
