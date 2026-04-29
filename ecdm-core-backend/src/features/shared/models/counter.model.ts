import mongoose, { Schema, Model } from 'mongoose';

// Counter uses string _id for custom counter names (e.g., 'marketing-lead', 'sales-lead')
interface ICounter {
    _id: string;
    sequence: number;
}

const counterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    sequence: { type: Number, default: 1000 },
});

const Counter: Model<ICounter> = mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Get the next sequence value for a given counter name.
 * Uses findOneAndUpdate with upsert to ensure atomicity.
 */
export const getNextSequence = async (counterName: string): Promise<number> => {
    const counter = await Counter.findOneAndUpdate(
        { _id: counterName },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
    );
    return counter.sequence;
};

export default Counter;

