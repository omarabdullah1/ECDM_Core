import mongoose, { Schema, Model } from 'mongoose';
import { IEmployeeDocument, Department, EmployeeStatus, EmployeeSector } from '../types/employee.types';

const employeeSchema = new Schema<IEmployeeDocument>(
    {
        firstName:  { type: String, required: true, trim: true },
        lastName:   { type: String, required: true, trim: true },
        email:      { type: String, required: true, trim: true, lowercase: true, unique: true },
        phone:      { type: String, trim: true },
        department: { type: String, enum: Object.values(Department), required: true },
        position:   { type: String, required: true, trim: true },
        hireDate:   { type: Date },
        salary:     { type: Number, min: 0 },
        status:         { type: String, enum: Object.values(EmployeeStatus), default: EmployeeStatus.Active },
        userId:         { type: Schema.Types.ObjectId, ref: 'User' },
        jobDescription: { type: String, trim: true, maxlength: [1000, 'Job description too long'] },
        sector:         { type: String, enum: Object.values(EmployeeSector) },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

employeeSchema.virtual('fullName').get(function (this: IEmployeeDocument) {
    return `${this.firstName} ${this.lastName}`;
});

employeeSchema.index({ department: 1 });
employeeSchema.index({ status:     1 });
employeeSchema.index({ firstName: 'text', lastName: 'text', position: 'text' });

const Employee: Model<IEmployeeDocument> = mongoose.model<IEmployeeDocument>('Employee', employeeSchema);
export default Employee;
