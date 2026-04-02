// Test setup — mock browser APIs
const store = {}
Object.defineProperty(window, 'localStorage', { value: {
  getItem: k => store[k] || null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: k => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: i => Object.keys(store)[i] || null,
}})
window.speechSynthesis = { speak:()=>{}, cancel:()=>{}, getVoices:()=>[] }
window.AudioContext = class { resume(){} close(){} createAnalyser(){ return {connect:()=>{},fftSize:0,frequencyBinCount:64,getByteFrequencyData:()=>{},getByteTimeDomainData:()=>{}} } createMediaStreamSource(){ return {connect:()=>{}} } }
window.webkitAudioContext = window.AudioContext
global.fetch = () => Promise.resolve({ ok:true, json:()=>Promise.resolve({content:[{type:'text',text:'Test'}]}), body:{getReader:()=>({read:()=>Promise.resolve({done:true,value:null})})} })
