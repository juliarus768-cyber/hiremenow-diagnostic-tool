const diagnosticForm = document.querySelector('#diagnosticForm');
const formStatus = document.querySelector('#formStatus');
const submitButton = document.querySelector('#submitButton');
const diagnosticResult = document.querySelector('#diagnosticResult');

const fields = [
  {
    input: document.querySelector('#targetTitle'),
    errorId: 'targetTitleError',
  },
  {
    input: document.querySelector('#resumeText'),
    errorId: 'resumeTextError',
  },
];

function setFieldValidity(field, isValid) {
  const wrapper = field.input.closest('.form-field');

  field.input.setAttribute('aria-invalid', String(!isValid));

  if (isValid) {
    field.input.removeAttribute('aria-describedby');
  } else {
    field.input.setAttribute('aria-describedby', field.errorId);
  }

  wrapper.classList.toggle('has-error', !isValid);
}

function setStatus(message, type) {
  formStatus.textContent = message;
  formStatus.dataset.type = type;
}

function validateForm() {
  let firstInvalidField = null;

  fields.forEach((field) => {
    const isValid = field.input.value.trim().length > 0;
    setFieldValidity(field, isValid);

    if (!isValid && !firstInvalidField) {
      firstInvalidField = field.input;
    }
  });

  return firstInvalidField;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDiagnostic(markdownText) {
  const escaped = escapeHtml(markdownText);
  const withHeadings = escaped.replace(/(^|\n)(#{1,3}\s*)?(\d+\.\s+)?([A-Z][^\n:]{2,80})(?=\n)/g, (match, prefix, hashes, number, heading) => {
    const cleanHeading = `${number || ''}${heading}`.trim();
    return `${prefix}<h3>${cleanHeading}</h3>`;
  });

  const withParagraphs = withHeadings
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();

      if (!trimmed) {
        return '';
      }

      if (trimmed.startsWith('<h3>')) {
        return trimmed;
      }

      const lines = trimmed.split('\n').filter(Boolean);
      const isList = lines.every((line) => /^[-*]\s+/.test(line));

      if (isList) {
        const items = lines.map((line) => `<li>${line.replace(/^[-*]\s+/, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
      }

      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  diagnosticResult.innerHTML = `<div class="result-eyebrow">Your diagnostic result</div>${withParagraphs}`;
  diagnosticResult.hidden = false;
}

async function requestDiagnostic(formData) {
  const response = await fetch('/api/diagnostic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      targetTitle: formData.get('targetTitle'),
      jobPosting: formData.get('jobPosting'),
      resumeText: formData.get('resumeText'),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'The diagnostic could not be generated. Please try again.');
  }

  if (!data.diagnostic) {
    throw new Error('The diagnostic response was empty. Please try again.');
  }

  return data.diagnostic;
}

fields.forEach((field) => {
  field.input.addEventListener('input', () => {
    if (field.input.value.trim().length > 0) {
      setFieldValidity(field, true);
    }

    setStatus('', '');
  });
});

diagnosticForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (submitButton.disabled) {
    return;
  }

diagnosticForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const firstInvalidField = validateForm();

  if (firstInvalidField) {
    setStatus('Please complete the required fields before starting the diagnostic.', 'error');
    firstInvalidField.focus();
    return;
  }

  setLoadingState(true);
  setStatus('Generating your diagnostic. This may take a moment...', 'loading');
  diagnosticResult.hidden = true;
  diagnosticResult.innerHTML = '';

  try {
    const diagnostic = await requestDiagnostic(new FormData(diagnosticForm));
    renderDiagnostic(diagnostic);
    setStatus('Diagnostic complete.', 'success');
    diagnosticResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    setLoadingState(false);
  }
});
