export const generateSample = (id: string) => ({
    "data": {
        "id": id,
        "events": [
            {
                "eid": "IMPRESSION",
                "ets": 1.672657002221E12,
                "ver": "3.0",
                "mid": "IMPRESSION:2b5834e196f485c17c4e49d292af43c0",
                "actor": {
                    "id": "0c45959486f579c24854d40a225d6161",
                    "type": "User"
                },
                "context": {
                    "channel": "01268904781886259221",
                    "pdata": {
                        "id": "staging.diksha.portal",
                        "ver": "5.1.0",
                        "pid": "sunbird-portal"
                    },
                    "env": "public",
                    "sid": "23850c90-8a8c-11ed-95d0-276800e1048c",
                    "did": "0c45959486f579c24854d40a225d6161",
                    "cdata": [],
                    "rollup": {
                        "l1": "01268904781886259221"
                    },
                    "uid": "anonymous"
                },
                "object": {},
                "tags": [
                    "01268904781886259221"
                ],
                "edata": {
                    "type": "view",
                    "pageid": "login",
                    "subtype": "pageexit",
                    "uri": "https://staging.sunbirded.org/auth/realms/sunbird/protocol/openid-connect/auth?client_id\u003dportal\u0026state\u003d254efd70-6b89-4f7d-868b-5c957f54174e\u0026redirect_uri\u003dhttps%253A%252F%252Fstaging.sunbirded.org%252Fresources%253Fboard%253DState%252520(Andhra%252520Pradesh)%2526medium%253DEnglish%2526gradeLevel%253DClass%2525201%2526%2526id%253Dap_k-12_1%2526selectedTab%253Dhome%2526auth_callback%253D1\u0026scope\u003dopenid\u0026response_type\u003dcode\u0026version\u003d4",
                    "visits": []
                },
                "syncts": 1672657005814,
                "@timestamp": "2023-01-02T10:56:45.814Z",
                "flags": {
                    "ex_processed": true
                }
            },
            {
                "eid": "LOG",
                "ets": 1672656997928,
                "ver": "3.0",
                "mid": "50263f0f-c2d5-4b15-95f4-5384c537f6cc",
                "actor": {
                    "id": "internal",
                    "type": "Consumer"
                },
                "context": {
                    "channel": "0126796199493140480",
                    "pdata": {
                        "id": "staging.sunbird.learning.service",
                        "pid": "learner-service",
                        "ver": "5.0.0"
                    },
                    "env": "Organisation",
                    "cdata": [
                        {
                            "id": "50263f0f-c2d5-4b15-95f4-5384c537f6cc",
                            "type": "Request"
                        }
                    ],
                    "rollup": {}
                },
                "edata": {
                    "level": "info",
                    "type": "Api_access",
                    "message": "",
                    "params": [
                        {
                            "method": "POST"
                        },
                        {
                            "url": "/v1/org/search"
                        },
                        {
                            "duration": 0
                        },
                        {
                            "status": "OK"
                        }
                    ]
                }
            }
        ]
    }
});
