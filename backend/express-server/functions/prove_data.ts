import {$} from "bun";


const NOTARY_SERVER = process.env.NOTARY_SERVER || "";
 
export default async function proveLichessData(
  URL: string
) { 
  return await $`vlayer web-proof-fetch --url ${URL} --notary ${NOTARY_SERVER}"`.text();  
  }