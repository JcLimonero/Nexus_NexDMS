// Product Colors
export type IProductColor =
  | "white"
  | "black"
  | "red"
  | "green"
  | "purple"
  | "yellow"
  | "blue"
  | "gray"
  | "orange"
  | "pink";

// Product Size
export type IProductSize = "M" | "L" | "XL";

// Product Tag
export type IProductTags =
  | "Spykar"
  | "Lee"
  | "Hudson"
  | "Denizen"
  | "Levis"
  | "Diesel";

export interface IProducts {
  id?: number;
  img?: string;
  name?: string;
  note?: string;
  description?: string;
  discountPrice?: number;
  price?: number;
  status?: string;
  availability?: boolean;
  stock?: string;
  review?: string;
  category?: string;
  colors?: IProductColor[];
  size?: IProductSize[];
  tags?: IProductTags[];
  variants?: Variants[];
}

export interface Variants {
  color: string;
  images: string;
}
// Color Filter
export interface IColorFilter {
  color?: IProductColor;
}

// Tag Filter
export interface ITagFilter {
  tag: IProductTags;
}
