import './scss/main.scss';
import type { IAppData, ITask } from './model/itask';
import type { TaskStatus, UserRole } from './model/types';

let state: IAppData = {
  currentUser: { id: 'u1', name: 'Ірина Коваль', role: 'pm', avatar: '/p1.jpg' },
  project: {
    id: 'PRJ-M10',
    name: 'Система лабораторної діагностики «МедЛаб»',
    client: 'Міська клінічна лікарня',
    startDate: '2026-10-01',
    deadline: '2026-12-31',
    desc: 'Розробка вебплатформи для автоматизації обліку лабораторних досліджень.',
    plannedBudget: 120000,
    hourlyRate: 600
  },
  stages: [],
  teamPool: [],
  team: [],
  documents: [],
  tasks: [],
  workLogs: []
};

let activeTaskId: string | null = null;

// Функція завантаження JSON 
async function load(): Promise<void> {
  try {
    const res = await fetch('/data.json');
    if (!res.ok) throw new Error('Помилка читання data.json');
    state = await res.json();

    setupRoleSwitch();
    setupPassport();
    setupStages();
    setupDocuments();
    setupTeam();
    setupCreateTask();
    setupAssignee();
    setupKanbanAndStatus();
    setupTimeLogging();
    setupSearch();
    setupCookie();

    renderAll();
  } catch (err) {
    console.error('Помилка:', err);
  }
}

function renderAll(): void {
  const nameEl = document.getElementById('project-name-display');
  if (nameEl) nameEl.textContent = state.project.name;

  renderStages();
  renderDocuments();
  renderTeam();
  renderKanban(state.tasks);

  if (state.tasks.length > 0 && !activeTaskId) {
    selectTask(state.tasks[0].id);
  } else if (activeTaskId) {
    selectTask(activeTaskId);
  }

  calculateBudget();
  applyRolePermissions();
}


function setupRoleSwitch(): void {
  const roleSelect = document.getElementById('role-select') as HTMLSelectElement;
  if (!roleSelect) return;
  roleSelect.value = state.currentUser.role;
  roleSelect.addEventListener('change', () => {
    state.currentUser.role = roleSelect.value as UserRole;
    applyRolePermissions();
    calculateBudget();
  });
}

function applyRolePermissions(): void {
  const isPM = state.currentUser.role === 'pm';
  const budgetBox = document.getElementById('pm-budget-box');
  if (budgetBox) budgetBox.style.display = isPM ? 'block' : 'none';

  document.querySelectorAll('.btn-doc-delete').forEach(btn => {
    (btn as HTMLElement).style.display = isPM ? 'inline-block' : 'none';
  });
}

function setupPassport(): void {
  const modal = document.getElementById('project-modal');
  const form = document.getElementById('project-form') as HTMLFormElement;
  const submitBtn = document.getElementById('btn-submit-project') as HTMLButtonElement;
  const btnPassport = document.getElementById('btn-passport');

  if (!modal || !form) return;

  //Оновлення стану кнопки відповідно до ролі
  const updateModalRoleState = () => {
    const isDev = state.currentUser.role === 'dev';
    if (submitBtn) {
      submitBtn.disabled = isDev;
      if (isDev) {
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.textContent = 'Створення недоступне (помилка доступу: тільки PM)';
      } else {
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = 'Створити та відкрити проєкт';
      }
    }
  };

  //показуємо модальне вікно при запуску
  modal.style.display = 'flex';
  updateModalRoleState();

  // Обробка форми створення
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // Забороняє перезавантаження сторінки

    if (state.currentUser.role === 'dev') {
      alert('Помилка прав доступу! Розробник не має права створювати проєкт.');
      return;
    }

    const nameInput = document.getElementById('proj-input-name') as HTMLInputElement;
    const clientInput = document.getElementById('proj-input-client') as HTMLInputElement;
    const startInput = document.getElementById('proj-input-start') as HTMLInputElement;
    const deadlineInput = document.getElementById('proj-input-deadline') as HTMLInputElement;
    const descInput = document.getElementById('proj-input-desc') as HTMLTextAreaElement;

    const nameVal = nameInput ? nameInput.value.trim() : '';
    const startVal = startInput ? startInput.value : '';
    const deadlineVal = deadlineInput ? deadlineInput.value : '';

    if (!nameVal) {
      alert('Помилка! Поле «Назва проєкту» є обов’язковим для заповнення.');
      return;
    }
    if (!startVal) {
      alert('Помилка! Поле «Дата старту» є обов’язковим.');
      return;
    }
    if (deadlineVal && startVal) {
      if (new Date(deadlineVal) < new Date(startVal)) {
        alert('Помилка! Невалідний діапазон дат: дата завершення не може бути раніше за дату початку.');
        return; // Зупиняємо виконання — вікно залишається відкритим
      }
    }
    const descVal = descInput ? descInput.value.trim() : '';
    if (descVal.length > 500) {
      alert(`Помилка! Опис занадто довгий (${descVal.length} символів). Максимум — 500.`);
      return;
    }

    state.project = {
      id: `PRJ-M${Math.floor(100 + Math.random() * 900)}`,
      name: nameVal,
      client: clientInput ? clientInput.value.trim() : '',
      startDate: startVal,
      deadline: deadlineVal,
      desc: descVal,
      plannedBudget: 120000,
      hourlyRate: 600
    };

    // Закриваємо модальне вікно
    modal.style.display = 'none';

    renderAll();
  });

  // Відкриття вікна за трьома крапками на панелі
  if (btnPassport) {
    btnPassport.addEventListener('click', () => {
      if (state.currentUser.role === 'dev') {
        alert('Помилка прав доступу! Лише PM може змінювати паспорт проєкту.');
        return;
      }
      modal.style.display = 'flex';
      updateModalRoleState();
    });
  }

  // перемикання ролі в шапці сайту
  const roleSelect = document.getElementById('role-select') as HTMLSelectElement;
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      updateModalRoleState();
    });
  }
}

function setupStages(): void {
  const btn = document.getElementById('btn-add-stage');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (state.currentUser.role !== 'pm') {
      alert('Лише PM може додавати нові етапи.');
      return;
    }

    const name = prompt('Назва нового етапу:');
    if (!name || !name.trim()) {
      alert('Назва етапу обов’язкова!');
      return;
    }
    const startDate = prompt('Дата початку (РРРР-ММ-ДД):', '2026-11-01');
    if (!startDate || !startDate.trim()) return;
    // Запитуємо дедлайн
    const deadline = prompt('Дедлайн етапу (РРРР-ММ-ДД):', '2026-11-30');
    if (!deadline || !deadline.trim()) return;
    // Перевірка коректності дат
    if (new Date(deadline) < new Date(startDate)) {
      alert('Помилка! Дедлайн не може бути раніше за дату початку.');
      return;
    }

    state.stages.push({
      id: `s${Date.now()}`,
      name: name.trim(),
      startDate: startDate.trim(),
      deadline: deadline.trim(),
      completed: false,
      progress: 0,
      prevProgress: 0
    });

    renderStages();
  });
}

function renderStages(): void {
  const container = document.getElementById('stages-list');
  if (!container) return;

  const isPM = state.currentUser.role === 'pm';

  container.innerHTML = state.stages.map(st => `
    <div class="phase-item" style="margin-bottom: 12px;">
      <div class="phase-header" style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; color: #fff;">
        <label style="cursor: pointer; display: flex; align-items: flex-start; gap: 8px; flex: 1;">
          <input type="checkbox" class="stage-cb" data-id="${st.id}" ${st.completed ? 'checked' : ''} ${!isPM ? 'disabled' : ''} style="margin-top: 2px;">
          <div>
            <div style="${st.completed ? 'text-decoration: line-through; color: #C2C7CF;' : ''}; font-weight: 500;">
              ${st.name}
            </div>
            <div class="edit-dates" data-id="${st.id}" 
                style="font-size: 10px; color: #8C939D; margin-top: 2px; cursor: ${isPM ? 'pointer' : 'default'};"
                title="${isPM ? 'Клікніть, щоб змінити терміни' : ''}">
              Термін: ${st.startDate} — ${st.deadline}
            </div>
          </div>
        </label>

        <!-- Відсоток прогресу -->
        <span class="phase-pct edit-progress" data-id="${st.id}" 
              style="font-weight: 700; margin-left: 8px; cursor: ${isPM && !st.completed ? 'pointer' : 'default'};" 
              title="${isPM && !st.completed ? 'Клікніть, щоб змінити %' : ''}">
          ${st.completed ? 100 : st.progress}%
        </span>
      </div>

      <!-- Смужка прогресу -->
      <div class="progress-track" style="height: 4px; background: #464C55; border-radius: 2px; margin-top: 6px; overflow: hidden;">
        <div class="progress-bar" style="width: ${st.completed ? 100 : st.progress}%; height: 100%; background: #ffffff;"></div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.stage-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-id');
      const st = state.stages.find(s => s.id === id);
      if (!st) return;

      const isChecked = (e.target as HTMLInputElement).checked;
      st.completed = isChecked;

      if (isChecked) {
        st.prevProgress = st.progress;
        st.progress = 100;
      } else {
        st.progress = st.prevProgress !== undefined ? st.prevProgress : 0;
      }
      renderStages();
    });
  });

  if (isPM) {
    container.querySelectorAll('.edit-dates').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        const st = state.stages.find(s => s.id === id);
        if (!st) return;

        const newStart = prompt(`Нова дата початку для «${st.name}» (РРРР-ММ-ДД):`, st.startDate);
        if (!newStart || !newStart.trim()) return;

        const newDeadline = prompt(`Новий дедлайн для «${st.name}» (РРРР-ММ-ДД):`, st.deadline);
        if (!newDeadline || !newDeadline.trim()) return;

        if (new Date(newDeadline) < new Date(newStart)) {
          alert('Помилка! Дедлайн не може бути раніше за дату початку.');
          return;
        }

        st.startDate = newStart.trim();
        st.deadline = newDeadline.trim();
        renderStages();
      });
    });

    container.querySelectorAll('.edit-progress').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        const st = state.stages.find(s => s.id === id);
        if (!st || st.completed) return;

        const val = prompt(`Новий % виконання для «${st.name}» (0-99):`, st.progress.toString());
        if (val === null) return;

        const num = parseInt(val, 10);
        if (isNaN(num) || num < 0 || num > 99) {
          alert('Введіть число від 0 до 99!');
          return;
        }

        st.progress = num;
        st.prevProgress = num;
        renderStages();
      });
    });
  }
}

function setupDocuments(): void {
  const fileInput = document.getElementById('doc-upload-input') as HTMLInputElement;
  const btn = document.getElementById('btn-upload-doc');
  if (btn && fileInput) {
    btn.addEventListener('click', () => {
      if (state.currentUser.role !== 'pm') {
        alert('Завантажувати файли дозволено лише PM.');
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!['pdf', 'docx', 'xlsx'].includes(ext)) {
        alert('Дозволено лише PDF, DOCX, XLSX!');
        fileInput.value = '';
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        alert('Файл більший за 25 МБ!');
        fileInput.value = '';
        return;
      }

      state.documents.push({
        id: `d${Date.now()}`,
        name: file.name,
        sizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(1)),
        ext: ext
      });
      renderDocuments();
      fileInput.value = '';
    });
  }
}

function renderDocuments(): void {
  const container = document.getElementById('docs-list');
  if (!container) return;
  const isPM = state.currentUser.role === 'pm';

  container.innerHTML = state.documents.map(d => `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:12px;">
      <a href="#" class="doc-dl" data-name="${d.name}" style="color:#fff; text-decoration:underline;">📄 ${d.name}</a>
      ${isPM ? `<button class="btn-doc-delete" data-id="${d.id}" style="background:none; border:none; color:#ff4d4f; cursor:pointer;">✖</button>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.doc-dl').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      alert(`Завантаження файлу: ${(e.target as HTMLElement).getAttribute('data-name')}`);
    });
  });

  container.querySelectorAll('.btn-doc-delete').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      state.documents = state.documents.filter(d => d.id !== id);
      renderDocuments();
    });
  });
}

function setupTeam(): void {
  const btn = document.getElementById('btn-add-member');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (state.currentUser.role !== 'pm') {
      alert('Додавати співробітників може лише PM.');
      return;
    }
    const available = state.teamPool.filter(p => !state.team.some(t => t.id === p.id));
    if (available.length === 0) {
      alert('Усі фахівці вже додані до команди!');
      return;
    }
    state.team.push(available[0]);
    renderTeam();
    populateAssignee();
  });
}

function renderTeam(): void {
  const container = document.getElementById('team-list');
  if (!container) return;
  const isPM = state.currentUser.role === 'pm';

  container.innerHTML = state.team.map(m => `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
        <img src="${m.avatar}" style="width:20px; height:20px; border-radius:50%;">
        <span style="font-size:12px; color:#fff;">${m.name}</span>
    </div>
    ${isPM ? `<button class="btn-remove-user" data-id="${m.id}" style="background:none; border:none; color:#ff4d4f; cursor:pointer;">✖</button>` : ''}
    </div>
`).join('');

  container.querySelectorAll('.btn-remove-user').forEach(b => {
    b.addEventListener('click', () => {
        if (state.currentUser.role !== 'pm') {
        alert('Помилка прав доступу! Лише менеджер (PM) може вилучати учасників з команди.');
        return;
        }
        const id = b.getAttribute('data-id');
        state.team = state.team.filter(t => t.id !== id);
        renderTeam();
        populateAssignee();
    });
  });
}

function setupCreateTask(): void {
  const btn = document.getElementById('btn-create-task');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (state.currentUser.role !== 'pm') {
      alert('Лише менеджер (PM) може створювати завдання.');
      return;
    }

    const title = prompt('Введіть назву завдання:');
    if (!title || !title.trim()) {
      alert('Назва завдання обов’язкова!');
      return;
    }

    const hoursStr = prompt('Планова оцінка годин:', '8');
    const estHours = parseFloat(hoursStr || '0');
    if (isNaN(estHours) || estHours <= 0) {
      alert('Плановий час має бути більшим за 0!');
      return;
    }

    const deadline = prompt('Вкажіть дедлайн завдання (РРРР-ММ-ДД):', '2026-11-15');
    if (!deadline || !deadline.trim()) return;

    const deadlineDate = new Date(deadline.trim());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(deadlineDate.getTime()) || deadlineDate < today) {
      alert('Помилка! Дедлайн завдання не може бути раніше поточної дати.');
      return;
    }

    let maxNum = 100;
    state.tasks.forEach(t => {
      const match = t.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum && num < 1000) maxNum = num;
      }
    });
    const nextTaskId = `TASK-${maxNum + 1}`;


    const newTask: ITask = {
      id: nextTaskId,
      tag: `#${nextTaskId}`,
      title: title.trim(),
      desc: 'Робота згідно з технічним завданням.',
      status: 'todo',
      assigneeId: state.team.length > 0 ? state.team[0].id : '',
      estimatedHours: estHours,
      spentHours: 0,
      deadline: deadline.trim()
    };

    state.tasks.push(newTask);
    renderAll();
  });
} 

function setupAssignee(): void {
  populateAssignee();
  const select = document.getElementById('assignee-select') as HTMLSelectElement;
  if (!select) return;

  select.addEventListener('change', () => {
    if (state.currentUser.role !== 'pm') {
      alert('Змінювати виконавця може лише PM!');
      populateAssignee();
      return;
    }
    if (!activeTaskId) return;
    const task = state.tasks.find(t => t.id === activeTaskId);
    if (!task) return;

    task.assigneeId = select.value === 'none' ? undefined : select.value;
    renderKanban(state.tasks);
  });
}

function populateAssignee(): void {
  const select = document.getElementById('assignee-select') as HTMLSelectElement;
  if (!select) return;
  select.innerHTML = '<option value="none">Не призначено</option>' +
    state.team.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join('');
}

function setupKanbanAndStatus(): void {
  const select = document.getElementById('status-select') as HTMLSelectElement;
  if (!select) return;

  select.addEventListener('change', () => {
    if (!activeTaskId) return;
    const task = state.tasks.find(t => t.id === activeTaskId);
    if (!task) return;

    const newStatus = select.value as TaskStatus;

    if (task.status === 'todo' && newStatus === 'done') {
      alert('Порушення ланцюжка! Не можна перевести задачу з «До виконання» одразу у «Виконано».');
      select.value = task.status;
      return;
    }

    if (newStatus === 'done' && state.currentUser.role !== 'pm') {
      alert('Лише PM може підтвердити виконання таски після перевірки!');
      select.value = task.status;
      return;
    }

    task.status = newStatus;
    renderKanban(state.tasks);
  });
}

function renderKanban(list: ITask[]): void {
  const grid = document.getElementById('kanban-grid');
  if (!grid) return;

  const cols: { status: TaskStatus; title: string; extraClass?: string }[] = [
    { status: 'todo', title: 'До виконання' },
    { status: 'in_progress', title: 'В процесі' },
    { status: 'review', title: 'На перевірці' },
    { status: 'done', title: 'Виконано', extraClass: 'column-done' }
  ];

  grid.innerHTML = cols.map(c => {
    const colTasks = list.filter(t => t.status === c.status);
    return `
      <div class="column ${c.extraClass || ''}">
        <div class="column-header">
          <div class="col-name-wrap">
            <span class="status-circle">●</span>
            <span>${c.title} (${colTasks.length})</span>
          </div>
          <i class="bi bi-three-dots-vertical"></i>
        </div>
        ${colTasks.map(t => {
          const assignee = state.team.find(m => m.id === t.assigneeId);
          return `
            <div class="task-card" data-id="${t.id}" style="cursor:pointer;">
            <div class="card-top" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="task-tag">#${t.id.replace('#', '')}</span>
              <span style="color: #8C939D; font-size: 14px; letter-spacing: 1px;">•••</span>
            </div>
              <h4 class="task-title ${t.status === 'done' ? 'completed' : ''}">${t.title}</h4>
              <p class="task-desc">${t.desc}</p>
              <div class="card-bottom">
                <div style="display:flex; align-items:center; gap:6px;">
                  <img class="user-pic" src="${assignee ? assignee.avatar : '/p1.jpg'}" alt="Аватар">
                  <span style="font-size:11px; color:#C2C7CF;">${assignee ? assignee.name.split(' ')[0] : '—'}</span>
                </div>
                <span class="card-date">${t.deadline}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      if (id) selectTask(id);
    });
  });

  const countEl = document.getElementById('sprint-count');
  if (countEl) countEl.textContent = `${list.length} завдань у спринті`;
}

function selectTask(id: string): void {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  activeTaskId = task.id;

  const idEl = document.getElementById('details-task-id');
  const descEl = document.getElementById('details-desc');
  const estEl = document.getElementById('details-estimate');
  const remEl = document.getElementById('details-remaining');
  const statusSelect = document.getElementById('status-select') as HTMLSelectElement;
  const assigneeSelect = document.getElementById('assignee-select') as HTMLSelectElement;

  if (idEl) idEl.textContent = `ЗАВДАННЯ ${task.id}`;
  if (descEl) descEl.textContent = task.desc;
  if (estEl) estEl.textContent = `${task.estimatedHours} год`;

  const remaining = Math.max(0, task.estimatedHours - task.spentHours);
  if (remEl) remEl.textContent = `${remaining} год`;

  if (statusSelect) statusSelect.value = task.status;
  if (assigneeSelect) assigneeSelect.value = task.assigneeId || 'none';

  renderHistory(task.id);
}

function setupTimeLogging(): void {
  const btn = document.getElementById('btn-save-log');
  const inputHours = document.getElementById('log-hours') as HTMLInputElement;
  const inputDate = document.getElementById('log-date') as HTMLInputElement;
  const inputComment = document.getElementById('log-comment') as HTMLInputElement;

  if (inputDate && !inputDate.value) {
    inputDate.value = '2026-10-24';
  }

  if (!btn || !inputHours) return;

  btn.addEventListener('click', () => {
    if (!activeTaskId) {
      alert('Оберіть завдання!');
      return;
    }
    const task = state.tasks.find(t => t.id === activeTaskId);
    if (!task) return;

    const hours = parseFloat(inputHours.value);
    if (isNaN(hours) || hours <= 0) {
      alert('Вкажіть додатну кількість годин!');
      return;
    }

    const dateVal = inputDate.value || '2026-10-24';
    if (task.deadline) {
      const workDate = new Date(dateVal);
      const taskDeadline = new Date(task.deadline);
      workDate.setHours(0, 0, 0, 0);
      taskDeadline.setHours(0, 0, 0, 0);

      if (workDate > taskDeadline) {
        alert(`Помилка! Дата робіт (${dateVal}) перевищує встановлений дедлайн завдання (${task.deadline}).`);
        return;
      }
    }

    if (task.deadline) {
      const logDate = new Date(dateVal);
      const taskDeadline = new Date(task.deadline);
      logDate.setHours(0, 0, 0, 0);
      taskDeadline.setHours(0, 0, 0, 0);

      if (logDate > taskDeadline) {
        alert(`Помилка! Дата робіт (${dateVal}) перевищує дедлайн завдання (${task.deadline}).`);
        return;
      }
    }

    const targetUserId = task.assigneeId || state.currentUser.id;
    const targetDev = state.team.find(m => m.id === targetUserId);
    const devName = targetDev ? targetDev.name : 'розробника';

    const dayLogs = state.workLogs.filter(
      l => (l.userId === targetUserId || (l as any).developerId === targetUserId) && l.date === dateVal
    );
    const dayTotal = dayLogs.reduce((sum, l) => sum + l.hours, 0);

    if (dayTotal + hours > 10.0) {
      alert(`Помилка ліміту! Для спеціаліста ${devName} на дату ${dateVal} вже внесено ${dayTotal} год. Добовий ліміт - максимум 10 год.`);
      return;
    }

    state.workLogs.push({
      taskId: task.id,
      userId: targetUserId,
      date: dateVal,
      hours: hours,
      comment: inputComment ? inputComment.value.trim() : ''
    } as any);

    task.spentHours = (task.spentHours || 0) + hours;

    calculateBudget();
    renderAll();

    alert(`Успішно додано ${hours} год для ${devName}!`);
    inputHours.value = '';
    if (inputComment) inputComment.value = '';
  });
}

function renderHistory(taskId: string): void {
  const container = document.getElementById('history-list');
  if (!container) return;

  const logs = state.workLogs.filter(l => l.taskId === taskId);
  if (logs.length === 0) {
    container.innerHTML = '<div style="color:#C2C7CF; font-size:12px;">Історія відсутня</div>';
    return;
  }

  container.innerHTML = logs.map(l => `
    <div style="margin-bottom:8px; border-bottom:1px solid #464C55; padding-bottom:4px; font-size:12px; color:#fff;">
      <div style="display:flex; justify-content:space-between;">
        <strong>${l.date} • ${l.hours} год</strong>
      </div>
      <div style="color:#C2C7CF; font-size:11px; margin-top:2px;">${l.comment}</div>
    </div>
  `).join('');
}

function calculateBudget(): void {
  const totalHours = state.workLogs.reduce((sum, l) => sum + l.hours, 0);
  const totalCost = totalHours * state.project.hourlyRate;
  const remaining = state.project.plannedBudget - totalCost;

  const plannedEl = document.getElementById('budget-planned');
  const spentEl = document.getElementById('budget-spent');
  const remEl = document.getElementById('budget-remaining');

  if (plannedEl) plannedEl.textContent = `${state.project.plannedBudget.toLocaleString('uk-UA')} грн`;
  if (spentEl) spentEl.textContent = `${totalCost.toLocaleString('uk-UA')} грн (${totalHours} год)`;
  if (remEl) {
    remEl.textContent = `${remaining.toLocaleString('uk-UA')} грн`;
    remEl.style.color = remaining < 0 ? '#ff4d4f' : '#4cd964';
  }
}

function setupSearch(): void {
  const input = document.getElementById('search-input') as HTMLInputElement;
  if (!input) return;

  input.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase().trim();
    const filtered = state.tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.tag.toLowerCase().includes(q)
    );
    renderKanban(filtered);
  });
}

function setupCookie(): void {
  const banner = document.getElementById('cookie-banner');
  const btnAccept = document.getElementById('cookie-accept');

  if (btnAccept && banner) {
    btnAccept.addEventListener('click', () => {
      banner.style.display = 'none'; // Ховає банер тільки на час поточної сесії
    });
  }
}

document.addEventListener('DOMContentLoaded', load);