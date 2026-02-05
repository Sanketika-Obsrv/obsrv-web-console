import { NextFunction, Request, Response } from "express";
import { Kafka } from "kafkajs";

export default {
    name: 'connector:test',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        try {

            let { kafkaBrokers, topic } = request.body;

            if (!kafkaBrokers || typeof kafkaBrokers !== 'string' || !topic || typeof topic !== 'string') {
                return response.status(400).send({
                    error: "Invalid input: 'kafkaBrokers' and 'topic' must be non-empty strings."
                });
            }

            if (typeof kafkaBrokers === 'string') kafkaBrokers = kafkaBrokers.replace(/[^\w.,:-]/g, '');
            if (typeof topic === 'string') topic = topic.replace(/[^\w.-]/g, '');
            const topicsList = await service.getTopics(kafkaBrokers);
            const topicExists = topicsList.includes(topic);
            if (!topicExists) throw new Error("Topic does not exist");
            const result = { connectionEstablished: true, topicExists: topicExists }
            response.status(200).send(result);
        } catch (error: any) {
            console.log(error?.message);
            next("Failed to establish connection to the client")
        }
    }
};

const service = {
    getTopics(bootstrap: any) {
        const kafka = new Kafka({
            clientId: 'test-kafka-connection',
            brokers: bootstrap.split(","),
        });
        const admin = kafka.admin();
        return admin.listTopics();
    }
};