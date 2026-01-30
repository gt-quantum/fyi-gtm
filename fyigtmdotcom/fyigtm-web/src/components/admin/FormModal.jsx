import { useState, useEffect } from 'react';

export default function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields,
  initialData = {},
  submitLabel = 'Save',
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial = {};
      fields.forEach((field) => {
        initial[field.name] = initialData[field.name] ?? field.defaultValue ?? '';
      });
      setFormData(initial);
      setErrors({});
    }
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setErrors({ _form: err.message || 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {errors._form && <div className="form-error">{errors._form}</div>}
          {fields.map((field) => (
            <div className="form-group" key={field.name}>
              <label className="form-label">
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              {renderField(field, formData[field.name], (value) => handleChange(field.name, value))}
              {errors[field.name] && <span className="field-error">{errors[field.name]}</span>}
            </div>
          ))}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderField(field, value, onChange) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className="form-textarea"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows || 3}
          placeholder={field.placeholder}
        />
      );
    case 'select':
      return (
        <select className="form-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'checkbox':
      return (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{field.checkboxLabel || ''}</span>
        </label>
      );
    case 'number':
      return (
        <input
          type="number"
          className="form-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
        />
      );
    default:
      return (
        <input
          type={field.type || 'text'}
          className="form-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
  }
}
