import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * SheetConnection - Saved Google Sheet connection configurations
 * 
 * Stores reusable spreadsheet configurations for one-click syncing.
 * Service account JSON is stored encrypted for reuse.
 */
export interface ISheetConnectionDocument extends Document {
    connectionName: string;
    spreadsheetId: string;
    sheetRange: string;
    serviceAccountJson: string;
    createdBy?: mongoose.Types.ObjectId;
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const sheetConnectionSchema = new Schema<ISheetConnectionDocument>(
    {
        connectionName: {
            type:      String,
            required:  [true, 'Connection name is required'],
            trim:      true,
            maxlength: [100, 'Connection name cannot exceed 100 characters'],
        },
        spreadsheetId: {
            type:     String,
            required: [true, 'Spreadsheet ID is required'],
            trim:     true,
        },
        sheetRange: {
            type:     String,
            required: [true, 'Sheet range is required'],
            trim:     true,
        },
        serviceAccountJson: {
            type:     String,
            required: [true, 'Service account JSON is required'],
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref:  'User',
        },
        lastUsedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON:   { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Index for fast lookups
sheetConnectionSchema.index({ connectionName: 1 });
sheetConnectionSchema.index({ createdBy: 1 });

const SheetConnection: Model<ISheetConnectionDocument> = mongoose.model<ISheetConnectionDocument>(
    'SheetConnection',
    sheetConnectionSchema
);

export default SheetConnection;
