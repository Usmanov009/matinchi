export function initialSession() {
  return {
    step: "idle",
    isLoggedIn: false,
    dbUserId: null,
    isAdmin: false,
    loginTemp: { username: null },
    tgTemp: { phone: null },
    adTemp: { contentType: null, text: null, caption: null, mediaPath: null },
  };
}
