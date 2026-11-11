export const proposalCollections: readonly string[];
export const proposalKinds: readonly string[];
export const proposalQueueStorage: {
  readonly proposals: { indexes: (string | string[])[] };
};
export const proposalLimits: {
  readonly title: number;
  readonly body: number;
  readonly pageSize: number;
  readonly maxPageSize: number;
  readonly cursorMaxLength: number;
  readonly resolutionNote: number;
  readonly contractVersion: string;
};
