import { Routes } from "@angular/router";

export const authentication: Routes = [
  {
    path: "",
    children: [
      {
        path: "login",
        loadComponent: () => import("./login/login").then((m) => m.Login),
      },
      {
        path: "login/image",
        loadComponent: () =>
          import("./login-with-image/login-with-image").then(
            (m) => m.LoginWithImage,
          ),
      },
      {
        path: "login/video",
        loadComponent: () =>
          import("./login-with-video/login-with-video").then(
            (m) => m.LoginWithVideo,
          ),
      },
      {
        path: "register",
        loadComponent: () =>
          import("./register/register").then((m) => m.Register),
      },
      {
        path: "register/image",
        loadComponent: () =>
          import("./register-with-image/register-with-image").then(
            (m) => m.RegisterWithImage,
          ),
      },
      {
        path: "register/video",
        loadComponent: () =>
          import("./register-with-video/register-with-video").then(
            (m) => m.RegisterWithVideo,
          ),
      },
      {
        path: "unlockuser",
        loadComponent: () =>
          import("./unlock-user/unlock-user").then((m) => m.UnlockUser),
      },
      {
        path: "forgetpassword",
        loadComponent: () =>
          import("./forget-pwd/forget-pwd").then((m) => m.ForgetPwd),
      },
      {
        path: "resetpassword",
        loadComponent: () =>
          import("./reset-pwd/reset-pwd").then((m) => m.ResetPwd),
      },
    ],
  },
];
