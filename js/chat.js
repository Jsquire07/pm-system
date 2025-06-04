const supabase = window.supabase

const chatBox = document.getElementById('chatBox')
const chatForm = document.getElementById('chatForm')
const chatInput = document.getElementById('chatInput')
const typingIndicator = document.getElementById('typingIndicator')
const currentUser = localStorage.getItem('currentUser') || 'Unknown'

async function loadMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return console.error('Error loading messages:', error)
  renderMessages(data)
}

function renderMessages(messages) {
  chatBox.innerHTML = ''
  messages.forEach(renderMessage)
}

function renderMessage(message) {
  const msgDiv = document.querySelector(`[data-id="${message.id}"]`) || document.createElement('div')
  msgDiv.className = 'message'
  msgDiv.dataset.id = message.id
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
    msgDiv.querySelector('.meta').append(editBtn, delBtn)
  }

  if (!document.querySelector(`[data-id="${message.id}"]`)) {
    chatBox.appendChild(msgDiv)
  }
  chatBox.scrollTop = chatBox.scrollHeight
}

function formatMentions(text) {
  return text.replace(/@\w+/g, match => `<span class="mention">${match}</span>`)
}

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${hash % 360}, 70%, 60%)`
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = chatInput.value.trim()
  if (!text) return
  await supabase.from('messages').insert({ username: currentUser, text })
  chatInput.value = ''
  await supabase.from('typing').delete().eq('username', currentUser)
})

chatInput.addEventListener('input', async () => {
  if (!chatInput.value.trim()) {
    await supabase.from('typing').delete().eq('username', currentUser)
  } else {
    await supabase.from('typing')
      .upsert({ username: currentUser }, { onConflict: ['username'] })
  }
})

async function editMessage(message) {
  const newText = prompt('Edit your message:', message.text)
  if (!newText) return
  await supabase.from('messages').update({ text: newText }).eq('id', message.id)
}

async function deleteMessage(id) {
  if (confirm('Delete this message?')) {
    await supabase.from('messages').delete().eq('id', id)
  }
}

supabase
  .from('messages')
  .on('INSERT', payload => renderMessage(payload.new))
  .on('UPDATE', payload => renderMessage(payload.new))
  .on('DELETE', payload => {
    const el = document.querySelector(`[data-id="${payload.old.id}"]`)
    if (el) el.remove()
  })
  .subscribe()

supabase
  .from('typing')
  .on('*', payload => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      if (payload.new.username !== currentUser) {
        typingIndicator.textContent = `${payload.new.username} is typing...`
      }
    } else if (payload.eventType === 'DELETE') {
      typingIndicator.textContent = ''
    }
  })
  .subscribe()

loadMessages()
