import { getFirestore } from "firebase-admin/firestore";

// Use the 'vgrdb' named database (not the default database)
export const db = getFirestore("vgrdb");