import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';

const bootstrap = async (): Promise<void> => {
    await connectDB();

    app.listen(env.PORT, () => {
        console.log(`🚀  ECDM Core running on http://localhost:${env.PORT}  [${env.NODE_ENV}]`);
    });
};

bootstrap();
