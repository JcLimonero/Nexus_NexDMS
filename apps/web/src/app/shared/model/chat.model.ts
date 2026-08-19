// Chat users
export interface IChatUsers {
  id: number;
  name: string;
  status: string;
  profile: string;
  seen: string;
  online: boolean;
  typing: boolean;
  authenticate: number;
  call: ICall;
}

export interface ICall {
  status?: string;
  date_time?: string;
}

// Messages
export interface IMessages {
  sender?: number;
  time?: string;
  text?: string;
}

// Chate
export interface IChat {
  id?: number;
  message: IMessages[];
}

export interface IMessagePayload {
  sender?: number;
  receiver?: number;
  receiver_name?: string;
  message?: string;
  time?: string;
  text?: string;
}

export interface IChats {
  id?: number;
  message: IChatMessage[];
}
export interface IChatProfile {
  status: string;
  id: number;
  name: string;
  profile?: string;
}
export interface IChatMessage {
  sender: number;
  receiver: number;
  receiver_name: string;
  message: string;
}
