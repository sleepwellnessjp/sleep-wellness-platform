import {
  createClient,
  deleteClient,
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
  delete: deleteClient,
};

export type ClientsService = typeof clientsService;
