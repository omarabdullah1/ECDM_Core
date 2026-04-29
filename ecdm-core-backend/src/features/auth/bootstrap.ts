import User from './auth.model';
import { UserRole } from './auth.types';

export const bootstrapAdmin = async (): Promise<void> => {
    try {
        const adminExists = await User.findOne({ email: 'admin@ecdmsolutions.com' });
        
        if (!adminExists) {
            console.log('🚀 Bootstrap: Admin user not found. Creating default SuperAdmin...');
            
            await User.create({
                firstName: 'System',
                lastName: 'Admin',
                email: 'admin@ecdmsolutions.com',
                password: 'Admin1234',
                role: UserRole.SuperAdmin,
                isActive: true,
                phone: '+201000000000',
            });
            
            console.log('✅ Bootstrap: Default admin created successfully!');
        } else {
            console.log('ℹ️ Bootstrap: Admin user already exists. Skipping creation.');
        }
    } catch (error) {
        console.error('❌ Bootstrap: Error creating default admin:', error);
    }
};

