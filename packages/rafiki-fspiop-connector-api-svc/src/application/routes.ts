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
    private static readonly CONTENT_TYPE: string = "application/vnd.interoperability.quotes+json;version=1.1";

    private static BY_ID_MAP = new Map<string, any>();

    constructor(
        fsiopUrl : string,
        accessToken : string,
        timeoutMs: number, logger:ILogger
    ) {
        this._logger = logger;

        // http client:
        this.httpClient = axios.create({
            baseURL: fsiopUrl,
            timeout: timeoutMs
        });
        // "headers: {"Authorization": `Bearer ${accessToken}`}" could be passed to axios.create(), but that way, due
        // to a bug, it wouldn't be possible to change the access token later.
        this.setAccessToken(accessToken);

        // endpoints
        this._mainRouter.get("/", this.getExample.bind(this));
        this._mainRouter.get("/version", this.getVersion.bind(this));

        // Rafiki client endpoints:
        this._mainRouter.post("/mjl-parties", this.postMJLLookupParties.bind(this));
        this._mainRouter.post("/mjl-quotes", this.postMJLCreateQuote.bind(this));
        this._mainRouter.post("/mjl-transfers", this.postMJLCreateTransfer.bind(this));
        this._mainRouter.get("/mjl-quotes/:id/", this.getMJLCreateQuote.bind(this));

        // Async MJL API Webhooks
        this._mainRouter.get("/parties/MSISDN/:msisdn", this.mjlGetParties.bind(this));
        this._mainRouter.put("/parties/MSISDN/:msisdn", this.mjlPutPartiesResponse.bind(this));
        this._mainRouter.put("/quotes/:quoteId", this.mjlPutQuoteResponse.bind(this));
        this._mainRouter.put("/transfers/:transferId", this.mjlPutTransferResponse.bind(this));
    }

    get MainRouter():express.Router{
        return this._mainRouter;
    }

    setAccessToken(accessToken: string): void {
        this.httpClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        this.httpClient.defaults.headers.common["Accept"] = ExpressRoutes.CONTENT_TYPE;
        this.httpClient.defaults.headers.common["Content-Type"] = ExpressRoutes.CONTENT_TYPE;
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

    private async postMJLLookupParties(req: express.Request, res: express.Response): Promise<void> {
        try {
            const fsp = req.body.fsp as string;
            const msisdn = req.body.msisdn;
            const currency = req.body.currency;
            const key = msisdn;
            const axiosResponse: AxiosResponse = await this.httpClient.get(
                `/parties/MSISDN/${msisdn}?currency=${currency}`, {
                    headers: {
                        'FSPIOP-Source' : fsp,
                        'FSPIOP-Destination': fsp,
                        'Date' : new Date().toUTCString(),
                        'Accept': 'application/vnd.interoperability.parties+json;version=1.1',
                        'Content-Type': 'application/vnd.interoperability.parties+json;version=1.1'
                    }
                }
            );
            ExpressRoutes.BY_ID_MAP.set(key, 'WAITING');

            let counter = 0;
            do {
                counter++;
                await new Promise(f => setTimeout(f, 500));
            } while (ExpressRoutes.BY_ID_MAP.get(key) === 'WAITING' && counter < 20);

            const returnVal = ExpressRoutes.BY_ID_MAP.get(key);
            if (returnVal === "WAITING") {
                this.sendSuccessResponse(res, 404, {
                    status: 404,
                    message: "No response from lookup."
                });
            } else this.sendSuccessResponse(res, 200, returnVal);
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }

    private async postMJLCreateQuote(req: express.Request, res: express.Response): Promise<void> {
        try {
            const src = req.body.payer.partyIdInfo.fspId;
            const dest = req.body.payee.partyIdInfo.fspId;

            const axiosResponse: AxiosResponse = await this.httpClient.post(
                "/quotes/", {
                    quoteId: req.body.quoteId,
                    transactionId: req.body.transactionId,
                    amountType: "SEND",
                    amount: req.body.amount,
                    transactionType: {
                        initiator: "PAYER",
                        initiatorType: "BUSINESS",
                        scenario: "DEPOSIT",
                    },
                    payee: req.body.payee,
                    payer: req.body.payer,
                }, {
                    headers: {
                        'FSPIOP-Source' : src as string,
                        'FSPIOP-Destination': dest as string,
                        'FSPIOP-Date' : new Date().toUTCString(),
                        'Accept': 'application/vnd.interoperability.quotes+json;version=1.1',
                        'Content-Type': 'application/vnd.interoperability.quotes+json;version=1.1'
                    }
                }
            );
            this.sendSuccessResponse(res, axiosResponse.status, {
                status: axiosResponse.status,
                quoteId: req.body.quoteId,
                transactionId: req.body.transactionId
            });
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }

    private async postMJLCreateTransfer(req: express.Request, res: express.Response): Promise<void> {
        try {
            const src = req.body.payerFsp;
            const axiosResponse: AxiosResponse = await this.httpClient.post(
                "/transfers/", {
                    transferId: req.body.transferId,
                    amount: req.body.amount,
                    payeeFsp: req.body.payeeFsp,
                    payerFsp: req.body.payerFsp,
                    "ilpPacket": "AYICUgAAAAAAAAPoFWcuYmx1ZWJhbmsubXNpc2RuLjQ1NoICMGV5SjBjbUZ1YzJGamRHbHZia2xrSWpvaU5tRmhPRFU1TWpRdFpXVTVaQzAwTkRCbExXRTNNRGN0WmpsaFpEZ3hZelU1T0RBNUlpd2ljWFZ2ZEdWSlpDSTZJall6T0RGak9EWTVMV1UxWVdFdE5HWmpaQzFpWkdabExUaGlaV1EyWkRoaE9XSmhaaUlzSW5CaGVXVmxJanA3SW5CaGNuUjVTV1JKYm1adklqcDdJbkJoY25SNVNXUlVlWEJsSWpvaVRWTkpVMFJPSWl3aWNHRnlkSGxKWkdWdWRHbG1hV1Z5SWpvaU5EVTJJaXdpWm5Od1NXUWlPaUppYkhWbFltRnVheUo5ZlN3aWNHRjVaWElpT25zaWNHRnlkSGxKWkVsdVptOGlPbnNpY0dGeWRIbEpaRlI1Y0dVaU9pSk5VMGxUUkU0aUxDSndZWEowZVVsa1pXNTBhV1pwWlhJaU9pSXhNak1pTENKbWMzQkpaQ0k2SW1keVpXVnVZbUZ1YXlKOWZTd2lZVzF2ZFc1MElqcDdJbU4xY25KbGJtTjVJam9pUlZWU0lpd2lZVzF2ZFc1MElqb2lNVEFpZlN3aWRISmhibk5oWTNScGIyNVVlWEJsSWpwN0luTmpaVzVoY21sdklqb2lSRVZRVDFOSlZDSXNJbWx1YVhScFlYUnZjaUk2SWxCQldVVlNJaXdpYVc1cGRHbGhkRzl5Vkhsd1pTSTZJa0pWVTBsT1JWTlRJbjE5AA",
                    "condition": "CBua1ptN2l4qmcDCzg8Y_E4sfh71p0oCcrLI2M3WyT0",
                    expiration: new Date(Date.now() + 30_000).toISOString()
                }, {
                    headers: {
                        'FSPIOP-Source' : src as string,
                        'FSPIOP-Date' : new Date().toUTCString(),
                        'Accept': 'application/vnd.interoperability.transfers+json;version=1.1',
                        'Content-Type': 'application/vnd.interoperability.transfers+json;version=1.1'
                    }
                }
            );
            this.sendSuccessResponse(res, axiosResponse.status, {
                status: axiosResponse.status,
                transferId: req.body.transferId
            });
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }

    private async mjlPutQuoteResponse(req: express.Request, res: express.Response): Promise<void> {
        try {
            this._logger.info('putQuoteResponse');
            this._logger.info(req);
            this._logger.info(req.body);
            this._logger.info(req.headers);

            const uniqueId = randomUUID();
            //TODO call rafiki [finalizeMojaloopQuote]::::
            /*
            {
  "request": {
    "uniqueId": "1697639163913zqfd9",
    "headers": {
      "content-type": "application/vnd.interoperability.quotes+json;version=1.1",
      "content-length": "1167",
      "date": "Wed, 18 Oct 2023 14:26:01 GMT",
      "fspiop-source": "bluebank",
      "fspiop-destination": "greenbank",
      "fspiop-signature": "ut nisi ut culpa in",
      "fspiop-uri": "sit ut et",
      "fspiop-http-method": "PUT",
      "user-agent": "axios/1.5.1",
      "accept-encoding": "gzip, compress, deflate, br",
      "host": "greenbank-backend:4041",
      "connection": "close"
    },
    "queryParams": {},
    "body": {
      "transferAmount": {
        "currency": "EUR",
        "amount": "10"
      },
      "expiration": "2023-10-19T14:26:02.869Z",
      "ilpPacket": "AYICUgAAAAAAAAPoFWcuYmx1ZWJhbmsubXNpc2RuLjQ1NoICMGV5SjBjbUZ1YzJGamRHbHZia2xrSWpvaU1UYzNaVFV5TWpjdFlXVTVNUzAwTkRjekxXSTVZakV0TmpGaU5HUXlOalJqTUdFMklpd2ljWFZ2ZEdWSlpDSTZJalk1TWpJMk16UTJMVFF3WmpFdE5ERTJNUzFpWkdaaUxUZzNZekkwT1RjMU1qUmpNQ0lzSW5CaGVXVmxJanA3SW5CaGNuUjVTV1JKYm1adklqcDdJbkJoY25SNVNXUlVlWEJsSWpvaVRWTkpVMFJPSWl3aWNHRnlkSGxKWkdWdWRHbG1hV1Z5SWpvaU5EVTJJaXdpWm5Od1NXUWlPaUppYkhWbFltRnVheUo5ZlN3aWNHRjVaWElpT25zaWNHRnlkSGxKWkVsdVptOGlPbnNpY0dGeWRIbEpaRlI1Y0dVaU9pSk5VMGxUUkU0aUxDSndZWEowZVVsa1pXNTBhV1pwWlhJaU9pSXhNak1pTENKbWMzQkpaQ0k2SW1keVpXVnVZbUZ1YXlKOWZTd2lZVzF2ZFc1MElqcDdJbU4xY25KbGJtTjVJam9pUlZWU0lpd2lZVzF2ZFc1MElqb2lNVEFpZlN3aWRISmhibk5oWTNScGIyNVVlWEJsSWpwN0luTmpaVzVoY21sdklqb2lSRVZRVDFOSlZDSXNJbWx1YVhScFlYUnZjaUk2SWxCQldVVlNJaXdpYVc1cGRHbGhkRzl5Vkhsd1pTSTZJa0pWVTBsT1JWTlRJbjE5AA",
      "condition": "BiKbn0RO2Mbt8JzLk0YNmtwv1W2FuwnYFwt2Fj_mU1c",
      "payeeReceiveAmount": {
        "currency": "EUR",
        "amount": "10"
      },
      "payeeFspFee": {
        "currency": "EUR",
        "amount": "0.2"
      },
      "payeeFspCommission": {
        "currency": "EUR",
        "amount": "0.3"
      },
      "geoCode": {
        "latitude": "-90",
        "longitude": "-180"
      }
    }
  }
}
             */

            // TODO As green bank, we receive the quote and send to green bank.
            this.sendSuccessResponse(res, 200, {
                status: 200,
                body: null,
                uniqueId: `${uniqueId}`
            });
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }

    private async mjlPutTransferResponse(req: express.Request, res: express.Response): Promise<void> {
        try {
            //TODO call rafiki [finalizeMojaloopTransfer]::::
            this.sendSuccessResponse(res, 200, {
                body: null,
                status: 200
            });
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }

    private async mjlGetParties(req: express.Request, res: express.Response): Promise<void> {
        try {
            const msisdn = req.params.msisdn as string;
            const fsp = req.headers['FSPIOP-Source'] as string;

            // Provide FSIOP with the results:
            const axiosResponse: AxiosResponse = await this.httpClient.put(
                `/parties/MSISDN/${msisdn}`, {
                    party : {
                        partyIdInfo: {
                            partyIdType: "MSISDN",
                            partyIdentifier: msisdn,
                            fspId: fsp
                        },
                        merchantClassificationCode : "2795",
                        personalInfo: {
                            dateOfBirth : "1942-10-01",
                            complexName: {
                                lastName: "Smith",
                                middleName: "P",
                                firstName: "Daniel"
                            }
                        },
                        name: "John"
                    }
                }, {
                    headers: {
                        'FSPIOP-Source' : fsp,
                        'FSPIOP-Destination' : fsp,
                        'FSPIOP-Date' : new Date().toUTCString(),
                        'Accept': 'application/vnd.interoperability.transfers+json;version=1.1',
                        'Content-Type': 'application/vnd.interoperability.transfers+json;version=1.1'
                    }
                }
            );
            this.sendSuccessResponse(res, 200, {
                body: null,
                status: 200
            });
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }

    private async mjlPutPartiesResponse(req: express.Request, res: express.Response): Promise<void> {
        try {
            const msisdn = req.params.msisdn as string;
            ExpressRoutes.BY_ID_MAP.set(msisdn, req.body);

            this.sendSuccessResponse(res, 200, {
                status: 200
            });
        } catch (error: any) {
            this._logger.error(error);
            this.sendErrorResponse(res, 500, error.message || ExpressRoutes.UNKNOWN_ERROR_MESSAGE);
        }
    }

    private async getMJLCreateQuote(req: express.Request, res: express.Response): Promise<void> {
        try {
            try {
                const id = req.params.id as string;
                const src = req.headers["FSPIOP-Source"];
                const dest = req.headers["FSPIOP-Destination"];
                const quoteId = req.body.quoteId;

                //TODO this.setGenericHeaders(req, src as string, dest as string);

                /*ExpressRoutes.BY_ID_MAP.set(quoteId, 'WAITING');
                do {
                    //TODO sleep a bit, then try again.
                } while (ExpressRoutes.BY_ID_MAP.get(quoteId) === 'WAITING');*/

                
                const axiosResponse: AxiosResponse = await this.httpClient.get(`/quotes/${id}`);
                this.sendSuccessResponse(res, 200, axiosResponse.data);
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
