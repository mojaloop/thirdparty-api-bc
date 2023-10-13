/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

import axios, {AxiosError, AxiosInstance, AxiosResponse} from "axios";
import express from "express";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {randomUUID} from "crypto";

export class ExpressRoutes {
    private _logger:ILogger;

    private _mainRouter = express.Router();
    private readonly httpClient: AxiosInstance;

    private static readonly UNKNOWN_ERROR_MESSAGE: string = "unknown error";

    constructor(fsiopUrl : string, timeoutMs: number, logger:ILogger) {
        this._logger = logger;

        // http client:
        this.httpClient = axios.create({
            baseURL: fsiopUrl,
            timeout: timeoutMs
        });

        // endpoints
        this._mainRouter.get("/", this.getExample.bind(this));
        this._mainRouter.get("/version", this.getVersion.bind(this));

        // business endpoints
        this._mainRouter.post("/mjl-quote", this.postMJLCreateQuote.bind(this));
        this._mainRouter.post("/quotes", this.postMJLCreateQuote.bind(this));
    }

    get MainRouter():express.Router{
        return this._mainRouter;
    }

    private async getExample(req: express.Request, res: express.Response, next: express.NextFunction){
        this._logger.debug("Got request to example endpoint");
        return res.send({resp:"example worked"});
    }

    private async getVersion(req: express.Request, res: express.Response, next: express.NextFunction){
        this._logger.debug("Got request to version endpoint");
        return res.send({
            environmentName: "thirdparty-api-bc-rafiki-fspiop-connector-api-svc",
            bcName: "thirdparty-api-bc",
            appName: "thirdparty-api-bc-rafiki-fspiop-connector-api-svc",
            appVersion: "0.1",
            configsIterationNumber: 1
        });
        /*
        return res.send({
            environmentName: this._configClient.environmentName,
            bcName: this._configClient.boundedContextName,
            appName: this._configClient.applicationName,
            appVersion: this._configClient.applicationVersion,
            configsIterationNumber: this._configClient.appConfigs.iterationNumber
        });*/
    }

    private async postMJLCreateQuote(req: express.Request, res: express.Response): Promise<void> {
        try {
            try {
                const axiosResponse: AxiosResponse = await this.httpClient.put("/quotes", {
                    requesterFspId: req.body.requesterFspId,
                    destinationFspId: req.body.destinationFspId,
                    quoteId: req.body.quoteId,
                    bulkQuoteId: "",
                    transactionId: req.body.transactionId,
                    payeePartyIdType: req.body.payeePartyIdType,
                    payeePartyIdentifier: req.body.payeePartyIdentifier,
                    payeeFspId: req.body.payeeFspId,
                    payerPartyIdType: req.body.payerPartyIdType,
                    payerPartyIdentifier: req.body.payerPartyIdentifier,
                    payerFspId: req.body.payerFspId,
                    amountType: "SEND",
                    currency: req.body.currency,
                    amount: req.body.amount,
                    scenario: req.body.scenario,
                    initiator: req.body.initiator,
                    initiatorType: req.body.initiatorType,
                    transactionRequestId: req.body.transactionRequestId,
                    payee: req.body.payee,
                    payer: req.body.payer,
                    transactionType: req.body.transactionType,
                    ilpPacket: "",
                    extensionList: null,
                });
                this.sendSuccessResponse(res, 202, axiosResponse.data);
            } catch (error: any) {
                this._logger.error(error);
                this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
            }
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }



    private sendErrorResponse(res: express.Response, statusCode: number, message: string) {
        res.status(statusCode).json({message: message});
    }

    private sendSuccessResponse(res: express.Response, statusCode: number, data: any) {
        res.status(statusCode).json(data);
    }
}
