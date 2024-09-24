import oauth2orize from "oauth2orize";
import passport from "passport";
import login from 'connect-ensure-login';
import clientService from './../../services/oauthClients'
import userService from './../../services/oauthUsers'
import accessTokenService from './../../services/oauthAccessTokens'
import refreshTokenService from './../../services/oauthRefreshTokens'
import authorizationService from './../../services/oauthAuthorizationCodes'
import { getUid } from './../../utils/randomString'
import { NextFunction, Request, Response } from "express";
import appConfig from "../../../shared/resources/appConfig";

const server = oauth2orize.createServer();
const baseURL = appConfig.BASE_URL;

server.serializeClient((client, done) => {
  return done(null, client.id)
});

server.deserializeClient((id, done) => {
  clientService.find({id}).then((client: any) => {
    done(null, client)
  }).catch((error: any) => {
    done(error)
  })
});

const issueTokens = async (userId: string, clientId: string) => {

  const user = await userService.find({ id: userId })
  const accessToken = getUid(250);
  const refreshToken = getUid(250);
  await accessTokenService.save({ id: accessToken, user_id: userId, client_id: clientId })
  await refreshTokenService.save({ id: refreshToken, user_id: userId, client_id: clientId })
  const params = { username: user.user_name };
  return Promise.resolve({ accessToken, refreshToken, params });

}

server.grant(oauth2orize.grant.code((client, redirectUri, user, ares, done: any) => {
  const code = getUid(16);
  authorizationService.save({
    id: code,
    client_id: client.id,
    redirect_uri: redirectUri,
    user_id: user.id,
    user_name: user.username
  }).then((data) => {
    return done(null, code);
  }).catch((error: any) => {
    return done(error)
  })
}));



server.grant(oauth2orize.grant.token((client, user, ares, done) => {
  issueTokens(user.id, client.client_id).then((data) => {
    return done(null, data.accessToken, data.params)
  }).catch((error: any) => {
    return done(error)
  })
}));


server.exchange(oauth2orize.exchange.code((client, code, redirectUri, done: any) => {
  authorizationService.find({id: code}).then((authCode: any) => {
    if (client.id !== authCode.client_id) return done(null, false);
    if (redirectUri !== authCode.redirect_uri) return done(null, false);
    issueTokens(authCode.user_id, client.client_id).then((data) => {
      return done(null, data.accessToken, data.refreshToken, data.params)
    }).catch((error: any) => {
      return done(error)
    });
  }).catch((error: any) => {
    return done(error);
  })
}));

server.exchange(oauth2orize.exchange.password((client, username, password, scope, done) => {

  clientService.find({client_id: client.clientId}).then((localClient: any) => {
    if (!localClient) return done(null, false);
    if (localClient.clientSecret !== client.clientSecret) return done(null, false);

    userService.find({ user_name: username }).then((user: any) => {
      if (!user) return done(null, false);
      if (password !== user.password) return done(null, false);

      issueTokens(user.id, client.clientId).then((data) => {
        return done(null, data.accessToken, data.refreshToken, data.params)
      }).catch((error: any) => {
        return done(error)
      });
    }).catch((error: any) => {
      return done(error);
    })
  }).catch((error: any) => {
    return done(error);
  })
}));


//TODO: Client credentials based oauth need to be implementated

// server.exchange(oauth2orize.exchange.clientCredentials((client, scope, done) => {
//   // Validate the client
//   clientService.find({client_id: client.clientId}).then((localClient: any) => {
//     if (!localClient) return done(null, false);
//     if (localClient.clientSecret !== client.clientSecret) return done(null, false);
//     issueTokens(null, client.clientId).then((data) => {
//       return done(null, data.accessToken, data.refreshToken, data.params)
//     }).catch((error: any) => {
//       return done(error)
//     });
//   }).catch((error: any) => {
//     return done(error);
//   })
// }));


// issue new tokens and remove the old ones
server.exchange(oauth2orize.exchange.refreshToken(async (client, oldRefreshToken, scope, done) => {
  try {
    const token = await refreshTokenService.find({ id: oldRefreshToken })
    await accessTokenService.remove({ user_id: token.userId, client_id: token.clientId });
    await refreshTokenService.remove({ user_id: token.userId, client_id: token.clientId });
    const { accessToken, refreshToken, params } = await issueTokens(token.user_id, client.id);
    done(null, accessToken, refreshToken);
  } catch (error: any) {
    done(error)
  }
}));


export const authorization = [
  login.ensureLoggedIn(`${baseURL}/login`),
  server.authorization((clientId, redirectUri, done: any) => {
    clientService.find({client_id: clientId}).then((client: any) => {
      if (client.redirect_uri != redirectUri) {
        return done(new Error("client redirect uri not matching"))
      }

      return done(null, client, redirectUri);
    }).catch((error: any) => {
      return done(error);
    })
  }, (client, user, scope, type, areq, done) => {
    //TODO: Need to implement apporval workflow
    if (client.is_trusted) {
      return done(null, true, null, null)
    }
  })
];

export const decision = [
  login.ensureLoggedIn(`${baseURL}/login`),
  server.decision(),
];

export const token = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  server.token(),
  server.errorHandler(),
];

export const ensureLoggedInMiddleware = (request: Request, response: Response, next: NextFunction) => {
  if (!request?.session?.passport?.user) {
    const errorObj = {
      status: 401,
      message: "You don't have access to view this resource",
      responseCode: 'UNAUTHORIZED',
      errorCode: 'UNAUTHORIZED',
    };
    return next(errorObj)
  }
  return next();
}
