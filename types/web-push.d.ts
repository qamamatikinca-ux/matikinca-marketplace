declare module "web-push" {
  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload?: string, options?: Record<string, unknown>): Promise<unknown>;
  };
  export default webpush;
}
