/** 让 baw 的 checkKeytarAvailability() 失败，从而只用 BINANCE_BAW_DIR/session.json */
const err = new Error('keytar disabled for multi-wallet')
async function getPassword() {
  throw err
}
async function setPassword() {
  throw err
}
async function deletePassword() {
  throw err
}
const keytar = { getPassword, setPassword, deletePassword }
export { getPassword, setPassword, deletePassword }
export default keytar
