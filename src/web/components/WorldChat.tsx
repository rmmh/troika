import { useState } from 'preact/hooks';
import { CHAT_ROOMS, type ChatView } from '../../world/chat';
import type { WorldInput } from '../worldProtocol';

export function WorldChat({ clients, send, disabled }: { clients: ChatView[]; send: (message: WorldInput) => void; disabled: boolean }) {
  const [selected, select] = useState(0);
  const [text, setText] = useState('');
  const client = clients[selected];
  if (!client) return null;
  return <section class="world-chat" aria-label="Network chat">
    <h2>Network chat</h2>
    <p>Four independent clients talk to the native chat server. Ada, Lin and Sam also send occasional messages. Choose a client to join them.</p>
    <label>Chat client <select value={selected} onChange={event => select(Number(event.currentTarget.value))}>
      {clients.map((c,i) => <option key={c.nick} value={i}>{c.nick} · #{CHAT_ROOMS[c.room-1]}</option>)}
    </select></label>
    <label>Room <select aria-label="Room" value={client.room} disabled={disabled} onChange={event => send({type:'chat',client:selected,action:'join',room:Number(event.currentTarget.value)})}>
      {CHAT_ROOMS.map((room,i) => <option key={room} value={i+1}>#{room}</option>)}
    </select></label>
    <p aria-live="polite">{client.nick}: {client.status}</p>
    <div role="log" aria-label={`${client.nick} chat messages`} tabIndex={0} class="chat-log">
      {client.messages.filter(m=>m.room===client.room).map(m=><p key={m.id}><strong>{m.nick}</strong>: {m.text}</p>)}
    </div>
    <form onSubmit={event=>{event.preventDefault();if(text.trim()){send({type:'chat',client:selected,action:'say',text});setText('');}}}>
      <label>Message <input value={text} maxLength={54} required pattern="[ -~]+" disabled={disabled || !client.joined} onInput={event=>setText(event.currentTarget.value)} /></label>
      <button disabled={disabled || !client.joined || !text.trim()}>Send message</button>
    </form>
    <button disabled={disabled} onClick={()=>send({type:'chat',client:selected,action:client.joined?'leave':'join',room:client.room})}>{client.joined?'Leave room':'Join room'}</button>
    {client.status.startsWith('Timed out') && <button disabled={disabled} onClick={()=>send({type:'chat',client:selected,action:'retry'})}>Retry pending message</button>}
    <p>Rooms retain the latest 27 messages across the server. Chat resets when the world restarts or disks are restored.</p>
  </section>;
}
