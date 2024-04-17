import PocketBase from "pocketbase";
// initialise client
export const pbClient = new PocketBase("http://127.0.0.1:8090");

export const authenticatePb = async () => {
  const authData = await pbClient.admins.authWithPassword(
    process.env.PB_USERNAME ?? "",
    process.env.PB_PASSWORD ?? "",
  );
};
