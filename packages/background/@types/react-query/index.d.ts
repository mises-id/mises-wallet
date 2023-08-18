declare module "react-query" {
  export class QueryClient {
    fetchQuery(key: string, fn: () => void, config: any): Promise<any>;
  }
}
