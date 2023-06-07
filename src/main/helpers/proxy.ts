import { Request, Response } from "express";
import _ from 'lodash'

export const onError = ({ entity }: any) => (err: any, req: Request, res: Response) => {
    res.status(500).send('Something went wrong. Please try again later.');
}
