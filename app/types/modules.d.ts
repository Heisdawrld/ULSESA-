declare module "bcryptjs" {
  export function hash(data: string, salt: number | string): Promise<string>;
  export function hashSync(data: string, salt: number | string): string;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}

declare module "nodemailer" {
  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user?: string; pass?: string };
  }
  interface SendMailOptions {
    from?: string;
    to?: string;
    subject?: string;
    html?: string;
    text?: string;
  }
  interface Transporter {
    sendMail(options: SendMailOptions): Promise<unknown>;
  }
  function createTransport(options: TransportOptions): Transporter;
  export { createTransport, Transporter, SendMailOptions };
}
