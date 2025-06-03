// File: js/chat.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://qqlsttamprrcljlcqrk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzIiwiaWF0IjoxNjk4MDE2NjAwLCJleHAiOjE5MzM1OTIyMDB9.8jBDphYZFfPbzN1hSh-r4MEYF5PpZpqlIv0IdK8Vm5A'
const supabase = createClient(supabaseUrl, supabaseKey)

const chatBox = document.getElementById('chatBox')
const form = document.getElementById('chatForm')
const input = document.getElementById('chatInput')
const typingIndicator = document.getElementById('typingIndicator')
const currentUser = localStorage.getItem('currentUser') || 'Unknown'

// Load and render all messages
async function loadMessages() {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
  if (error) {
    console.error('Error loading messages:', error)
    return
  }
  chatBox.innerHTML = ''
  data.forEach(renderMessage)
}

function renderMessage(message) {
  const msgEl = document.createElement('div')
  msgEl.className = 'message'
  msgEl.dataset.id = message.id

  const name = document.createElement('strong')
  name.textContent = message.username || 'Unknown'
  name.style.color = stringToColor(message.username || 'Unknown')

  const text = document.createElement('span')
  text.className = 'text'
  text.innerHTML = ' ' + formatMentions(message.text)

  const timestamp = document.createElement('span')
  timestamp.className = 'timestamp'
  timestamp.textContent = ' ' + new Date(message.created_at).toLocaleTimeString()

  const meta = document.createElement('div')
  meta.className = 'meta'

  if (message.username === currentUser) {
    const editBtn = document.createElement('button')
    editBtn.textContent = 'Edit'
    editBtn.onclick = () => editMessage(message)

    const delBtn = document.createElement('button')
    delBtn.textContent = 'Delete'
    delBtn.onclick = () => deleteMessage(message.id)

    meta.appendChild(editBtn)
    meta.appendChild(delBtn)
  }

  msgEl.appendChild(name)
  msgEl.appendChild(timestamp)
  msgEl.appendChild(document.createElement('br'))
  msgEl.appendChild(text)
  msgEl.appendChild(meta)

  chatBox.appendChild(msgEl)
  chatBox.scrollTop = chatBox.scrollHeight
}

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = '#' + ((hash >> 24) & 0xFF).toString(16).padStart(2, '0') +
                      ((hash >> 16) & 0xFF).toString(16).padStart(2, '0') +
                      ((hash >> 8) & 0xFF).toString(16).padStart(2, '0')
  return color.slice(0, 7)
}

function formatMentions(text) {
  return text.replace(/@\w+/g, (match) => `<span class="mention">${match}</span>`)
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return

  await supabase.from('messages').insert({ username: currentUser, text })
  input.value = ''
  await supabase.from('typing').delete().eq('username', currentUser)
})

input.addEventListener('input', async () => {
  if (!input.value.trim()) {
    await supabase.from('typing').delete().eq('username', currentUser)
  } else {
    await supabase.from('typing').upsert({ username: currentUser }, { onConflict: ['username'] })
  }
})

async function editMessage(message) {
  const newText = prompt('Edit your message:', message.text)
  if (newText && newText !== message.text) {
    await supabase.from('messages').update({ text: newText }).eq('id', message.id)
  }
}

async function deleteMessage(id) {
  if (confirm('Delete this message?')) {
    await supabase.from('messages').delete().eq('id', id)
  }
}

// Real-time subscriptions
supabase.channel('realtime:messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    renderMessage(payload.new)
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
    const msg = document.querySelector(`[data-id="${payload.old.id}"]`)
    if (msg) msg.remove()
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
    const msg = document.querySelector(`[data-id="${payload.new.id}"]`)
    if (msg) {
      msg.querySelector('.text').innerHTML = ' ' + formatMentions(payload.new.text)
    }
  })
  .subscribe()

supabase.channel('realtime:typing')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'typing' }, (payload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      typingIndicator.textContent = `${payload.new.username} is typing...`
    } else {
      typingIndicator.textContent = ''
    }
  })
  .subscribe()

loadMessages()
