const supabase = window.supabase
const messageBox = document.getElementById('chatBox')
const form = document.getElementById('chatForm')
const input = document.getElementById('chatInput')
const typingIndicator = document.getElementById('typingIndicator')

let currentUser = localStorage.getItem('currentUser') || 'Unknown'

// Load and render messages
async function loadMessages() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    messageBox.innerHTML = ''
    data.forEach(renderMessage)
  } catch (err) {
    console.error('Error loading messages:', err)
  }
}

function renderMessage(message) {
  let msgDiv = document.querySelector(`[data-id="${message.id}"]`)
  if (!msgDiv) {
    msgDiv = document.createElement('div')
    msgDiv.className = 'message'
    msgDiv.dataset.id = message.id
    messageBox.appendChild(msgDiv)
  }

  msgDiv.innerHTML = `
    <div class="meta">
      <strong style="color:${stringToColor(message.username)}">${message.username || 'Unknown'}</strong>
      <span class="timestamp">${new Date(message.created_at).toLocaleTimeString()}</span>
    </div>
    <div class="text">${formatMentions(message.text)}</div>
  `

  if (message.username === currentUser) {
    const editBtn = document.createElement('button')
    editBtn.textContent = 'Edit'
    editBtn.onclick = () => editMessage(message)

    const delBtn = document.createElement('button')
    delBtn.textContent = 'Delete'
    delBtn.onclick = () => deleteMessage(message.id)

    const meta = msgDiv.querySelector('.meta')
    meta.append(editBtn, delBtn)
  }

  messageBox.scrollTop = messageBox.scrollHeight
}

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${hash % 360}, 70%, 60%)`
}

function formatMentions(text) {
  return text.replace(/@\w+/g, match => `<span class="mention">${match}</span>`)
}

// Send message
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return

  await supabase.from('messages').insert({
    username: currentUser,
    text
  })

  input.value = ''
  await supabase.from('typing').delete().eq('username', currentUser)
})

// Typing status
input.addEventListener('input', async () => {
  if (!input.value.trim()) {
    await supabase.from('typing').delete().eq('username', currentUser)
  } else {
    await supabase.from('typing').upsert({ username: currentUser }, { onConflict: ['username'] })
  }
})

// Edit message
async function editMessage(message) {
  const newText = prompt('Edit your message:', message.text)
  if (!newText) return
  await supabase.from('messages').update({ text: newText }).eq('id', message.id)
}

// Delete message
async function deleteMessage(id) {
  if (confirm('Delete this message?')) {
    await supabase.from('messages').delete().eq('id', id)
  }
}

// Real-time message sync
supabase
  .channel('messages-sync')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    renderMessage(payload.new)
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
    renderMessage(payload.new)
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
    const el = document.querySelector(`[data-id="${payload.old.id}"]`)
    if (el) el.remove()
  })
  .subscribe()

// Typing indicator
supabase
  .channel('typing-sync')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'typing' }, payload => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      if (payload.new.username !== currentUser) {
        typingIndicator.textContent = `${payload.new.username} is typing...`
      }
    } else if (payload.eventType === 'DELETE') {
      typingIndicator.textContent = ''
    }
  })
  .subscribe()

// Kickstart
loadMessages()
