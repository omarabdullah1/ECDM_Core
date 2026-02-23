import mongoose, { Schema, Model } from 'mongoose';
import { IMarketingDataDocument, MarketingDataStatus } from '../types/marketing-data.types';

const marketingDataSchema = new Schema<IMarketingDataDocument>(
    {
        name:    { type: String, required: [true, 'Name is required'], trim: true, maxlength: 150 },
        phone:   { type: String, required: [true, 'Phone is required'], trim: true },
        company: { type: String, trim: true },
        email:   { type: String, trim: true, lowercase: true },
        address: { type: String, trim: true },
        region:  { type: String, trim: true },
        sector:  { type: String, trim: true },

        uploadBatch: { type: String, required: [true, 'Upload batch identifier is required'], trim: true },
        dataSource:  { type: String, trim: true },

        status: {
            type:    String,
            enum:    Object.values(MarketingDataStatus),
            default: MarketingDataStatus.New,
        },

        // Populated when this record converts into a real Customer
        customer: { type: Schema.Types.ObjectId, ref: 'Customer' },

        notes: { type: String, maxlength: 2000 },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

marketingDataSchema.index({ status:      1 });
marketingDataSchema.index({ uploadBatch: 1 });
marketingDataSchema.index({ customer:    1 });
marketingDataSchema.index({ phone:       1 });
marketingDataSchema.index({ name: 'text', company: 'text', phone: 'text' });

// Mongoose model name: 'MarketingData' → MongoDB collection: 'marketingdatas'
const MarketingData: Model<IMarketingDataDocument> =
    mongoose.model<IMarketingDataDocument>('MarketingData', marketingDataSchema);
export default MarketingData;
