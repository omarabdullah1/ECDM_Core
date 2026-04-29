import { Request, Response, NextFunction } from 'express';
import * as customerSvc from '../../shared/services/customer.service';
import { sendSuccess } from '../../../utils/apiResponse';
import User from '../../auth/auth.model';

/**
 * GET /api/sales/my-customers
 * Returns customers associated with the logged-in salesperson
 */
export const getMyCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return sendSuccess(res, null, 'Authentication required', 401);
        }

        // Fetch full user details for name/email matching
        const user = await User.findById(userId).select('email firstName lastName').lean();
        if (!user) {
            return sendSuccess(res, null, 'User not found', 404);
        }

        const userEmail = user.email;
        const userName = `${user.firstName} ${user.lastName}`.trim();

        const result = await customerSvc.getSalesPersonCustomers(
            userId,
            userEmail,
            userName,
            req.query
        );

        sendSuccess(res, result, 'My customers fetched successfully');
    } catch (e) {
        next(e);
    }
};

