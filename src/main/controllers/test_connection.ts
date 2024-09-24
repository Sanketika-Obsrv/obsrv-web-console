import { NextFunction, Request, Response } from "express";
import { Kafka } from "kafkajs";
import _ from "lodash";

export default {
    name: 'connector:test',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { kafkaBrokers, topic } = request.body;
            const topicsList = await service.getTopics(kafkaBrokers);
            const topicExists = topicsList.includes(topic);
            if (!topicExists) throw { message: "Topic does not exist" };
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