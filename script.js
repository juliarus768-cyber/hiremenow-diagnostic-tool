const diagnosticForm = document.querySelector('#diagnosticForm');
const formStatus = document.querySelector('#formStatus');

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

fields.forEach((field) => {
  field.input.addEventListener('input', () => {
    if (field.input.value.trim().length > 0) {
      setFieldValidity(field, true);
    }

    setStatus('', '');
  });
});

diagnosticForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const firstInvalidField = validateForm();

  if (firstInvalidField) {
    setStatus('Please complete the required fields before starting the diagnostic.', 'error');
    firstInvalidField.focus();
    return;
  }

  diagnosticForm.reset();
  fields.forEach((field) => setFieldValidity(field, true));
  setStatus('Thank you. This front-end diagnostic form is ready for the future AI workflow.', 'success');
});
