import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import amqp, { Connection, Channel } from 'amqplib';
import Order from '../models/orderModel';
import redisClient from '../config/redis';
import serverConfig from '../config/server-config';
import httpStatus from 'http-status';
import messages from '../utils/message';

let connection: Connection | null = null;
let channel: Channel | null = null;

const connectRabbitMQ = async (): Promise<void> => {
    try {
        connection = await amqp.connect(serverConfig.RABBITMQ_URI as string);
        channel = await connection.createChannel();
        await channel.assertQueue('order.created');
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error(messages.RABBITMQ_CONNECTION_ERROR, error);
    }
};

const createOrder = async (req: Request, res: Response): Promise<void> => {
    const { item, price } = req.body;
    const orderId = uuidv4();

    const order = new Order({ orderId, item, price });
    await order.save();

    try {
        await redisClient.setEx(orderId, 3600, JSON.stringify(order));
    } catch (err) {
        console.error(messages.CACHE_ERROR, err);
    }
    if (channel) {
        await channel.sendToQueue('order.created', Buffer.from(JSON.stringify(order)));
    } else {
        console.error(messages.RABBITMQ_CHANNEL_ERROR);
    }

    res.status(httpStatus.CREATED).json({ message: messages.ORDER_CREATED, orderId });
};

const getOrder = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const data = await redisClient.get(id);
        if (data) {
            res.json(JSON.parse(data));
            return;
        } else {
            const order = await Order.findOne({ orderId: id });
            if (order) {
                await redisClient.setEx(id, 3600, JSON.stringify(order));
                res.json(order);
            } else {
                res.status(httpStatus.NOT_FOUND).json({ message: messages.ORDER_NOT_FOUND });
            }
        }
    } catch (err) {
        console.error('Error retrieving order:', err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: messages.INTERNAL_SERVER_ERROR });
    }
};

export { createOrder, getOrder, connectRabbitMQ };
