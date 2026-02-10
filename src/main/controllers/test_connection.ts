import { NextFunction, Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import * as _ from 'lodash';

export default {
    name: 'connector:test',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        try {
            const topic = _.get(request.body, 'topic', "").toString().trim();
            const kafkaBrokers = _.get(request.body, 'kafkaBrokers', "").toString().trim();
            
            if (!kafkaBrokers || !topic) {
                response.setHeader('Content-Type', 'application/json');
                return response.status(400).send({ error: "kafkaBrokers and topic are required" });
            }
            
            const topicsList = await service.getTopics(kafkaBrokers);
            const topicExists = topicsList.includes(topic);
            if (!topicExists) throw new Error("Topic does not exist");
            const result = { connectionEstablished: true, topicExists: topicExists };
            response.setHeader('Content-Type', 'application/json');
            response.status(200).send(result);
        } catch (error: any) {
            console.log(error?.message);
            response.setHeader('Content-Type', 'application/json');
            response.status(500).send({ error: "Failed to establish connection to the client" });
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