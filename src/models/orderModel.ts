import mongoose, { Document, Schema } from 'mongoose';


interface IOrder extends Document {
    orderId: string;
    item: string;
    price: number;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}


const orderSchema: Schema<IOrder> = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    item: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'created'
    },
}, {
    timestamps: true,
});


const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
