import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import {
    createInventoryItemSchema, updateInventoryItemSchema,
    createCategorySchema,      updateCategorySchema,
    createProductSchema,       updateProductSchema,
    createStockMovementSchema,
} from '../validation/inventory-plus.validation';
import * as ctrl from '../controllers/inventory-plus.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

// ── InventoryItem ─────────────────────────────────────────────────────────────
router.post('/items',       validate(createInventoryItemSchema), ctrl.createItem);
router.get('/items',        ctrl.getAllItems);
router.get('/items/:id',    ctrl.getItemById);
router.put('/items/:id',    validate(updateInventoryItemSchema), ctrl.updateItem);
router.delete('/items/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.removeItem);

// ── Category ──────────────────────────────────────────────────────────────────
router.post('/categories',       validate(createCategorySchema), ctrl.createCategory);
router.get('/categories',        ctrl.getAllCategories);
router.get('/categories/:id',    ctrl.getCategoryById);
router.put('/categories/:id',    validate(updateCategorySchema), ctrl.updateCategory);
router.delete('/categories/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.removeCategory);

// ── Product ───────────────────────────────────────────────────────────────────
router.post('/products',       validate(createProductSchema), ctrl.createProduct);
router.get('/products',        ctrl.getAllProducts);
router.get('/products/:id',    ctrl.getProductById);
router.put('/products/:id',    validate(updateProductSchema), ctrl.updateProduct);
router.delete('/products/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.removeProduct);

// ── StockMovement ─────────────────────────────────────────────────────────────
router.post('/stock-movements',    validate(createStockMovementSchema), ctrl.createStockMovement);
router.get('/stock-movements',     ctrl.getAllStockMovements);
router.get('/stock-movements/:id', ctrl.getStockMovementById);

export default router;
