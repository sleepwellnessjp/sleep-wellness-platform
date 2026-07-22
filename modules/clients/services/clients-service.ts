import {
  createClient,
  getClientById,
  loadClients,
  updateClientProfile,
} from "@/lib/repositories/client-repository";

/** Clients Module service. */
export const clientsService = {
  list: loadClients,
  getById: getClientById,
  create: createClient,
  updateProfile: updateClientProfile,
};

export type ClientsService = typeof clientsService;
