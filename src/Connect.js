/* eslint-disable react/sort-comp,no-underscore-dangle */
import React, { Component, cloneElement } from 'react';
import PropTypes from 'prop-types';
import unique from 'lodash.uniq';
import Serialize from './helpers/Serialize';
import Deserialize from './helpers/Deserialize';
import isEvent from './helpers/isEvent';

const connect = (Composed) => {

  class Connect extends Component {

    static contextTypes = {
      form: PropTypes.object,
    };
    static childContextTypes = {
      initialize: PropTypes.func,
      update: PropTypes.object,
      field: PropTypes.object,
      handleChange: PropTypes.func,
      handleBlur: PropTypes.func,

      subscribe: PropTypes.func,
      unSubscribe: PropTypes.func,
      handleSubmit: PropTypes.func,

      names: PropTypes.array,
      values: PropTypes.object,
      fields: PropTypes.object,
      errors: PropTypes.object,
      warnings: PropTypes.object,
    };
    static propTypes = {
      names: PropTypes.array,
      values: PropTypes.object,
      // fields: PropTypes.object,
      errors: PropTypes.object,
      warnings: PropTypes.object,
      validateOnBlur: PropTypes.bool,
    };
    static defaultProps = {
      names: [],
      values: {},
      // fields: {},
      errors: {},
      warnings: {},
      validateOnBlur: true,
    };

    constructor(props) {
      super(props);

      this.names = props.names || {};
      this.values = props.values || {};
      this.fields = {};
      this.errors = props.errors || {};
      this.warnings = props.warnings || {};

      this.state = {
        names: this.names,
        values: this.values,
        fields: this.fields,
        errors: this.errors,
        warnings: this.warnings,
        validateOnBlur: props.validateOnBlur,
        isValid: false,
        isSubmitted: false,
      };

      this.initialize = this.initialize.bind(this);
      // this.isValid = this.isValid.bind(this);

      this.submit = this.submit.bind(this);
      this.reset = this.reset.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.validate = this.validate.bind(this);

      this.subscriptions = {};
      this.subscribe = this.subscribe.bind(this);
      this.unSubscribe = this.unSubscribe.bind(this);
    }

    getChildContext() {
      const { names, errors, warnings } = this.state;
      return {
        initialize: this.initialize,
        update: this.update,
        field: this.field,

        subscribe: this.subscribe,
        unSubscribe: this.unSubscribe,
        handleSubmit: this.handleSubmit,
        handleChange: this.field.update,
        handleBlur: this.field.blur,

        names,
        values: this.values,
        fields: this.fields,
        errors,
        warnings,
      };
    }

    get requiredMessage() {
      const {
        form: { required } = { required: 'Required' },
      } = this.context;
      return required;
    }

    get formData() {
      const form = this.form;
      let field;
      let l;
      const result = {};
      if (typeof form === 'object' && form.nodeName === 'FORM') {
        const { elements } = form;
        const len = elements.length;
        for (let i = 0; i < len; i += 1) {
          field = elements[i];
          const {
            type, name, required, disabled,
          } = field;
          let value = '';
          if (name && type !== 'file' && type !== 'reset' && type !== 'submit' && type !== 'button') {
            result[name] = { type, name, required, disabled };

            if (type === 'select-multiple') {
              l = elements[i].options.length;
              for (let j = 0; j < l; j++) {
                if (field.options[j].selected) {
                  value = field.options[j].value;
                }
              }
            } else if (type === 'checkbox') {
              value = field.checked;
            } else if (type === 'radio') {
              const checked = field.checked;
              if (checked) {
                value = field.value;
              }
            }  else {
              value = field.value;
            }

            result[name].value = value;
          }
        }
      }
      return result;
    }

    get data() {
      const formData = this.formData;
      let element;
      return Object.keys(formData).reduce(({ fields, values, names }, name) => {
        element = formData[name];
        const field = fields[name];
        let value = (field && field.value) ? field.value : element.value;
        return {
          fields: {
            ...fields,
            [name]: {
              ...element,
              value,
            },
          },
          values: {
            ...values,
            [name]: value,
          },
          names: names.concat(name),
        };
      }, { fields: this.fields, values: this.values, names: this.names });
    }

    initialize(initial = {
      validateOnBlur: true,
      form: null,
      names: [],
      fields: {},
      values: {},
      errors: {},
      warnings: {},
    }) {
      this.form = initial.form;
      const { names, values } = this.props;
      ((data) => {
        let isValid = true;
        this.names = unique(data.names.concat(names, initial.names));

        this.values = {
          ...Deserialize(data.values, this.names),
          ...Deserialize(values, this.names),
          ...Deserialize(initial.values, this.names),
        };

        const dataFields = Deserialize(data.fields, this.names);
        const initialFields = Deserialize(initial.fields, this.names);
        const initialErrors = Deserialize(initial.errors, this.names);

        this.fields = this.names.reduce((fields, name) => {
          const field = {
            ...dataFields[name],
            ...initialFields[name],
            error: initialErrors[name],
          };
          const value = this.values[name] || field.value;
          if (field.required && !value) {
            isValid = false;
          }
          field.defaultValue = value;

          return {
            ...fields,
            [name]: { ...field, value },
          };
        }, {});

        const { errors, warnings } = this.validate({
          values: this.values,
          fields: this.fields,
        });

        this.errors = {
          ...errors,
          ...Deserialize(initial.errors, this.names),
        };
        this.warnings = {
          ...warnings,
          ...Deserialize(initial.warnings, this.names),
        };
        this.setState({
          validateOnBlur: initial.validateOnBlur,
          isValid,
          names: this.names,
          values: this.values,
          fields: this.fields,
          errors: this.errors,
          warnings: this.warnings,
        });
      })(this.data);
    }

    get field() {
      return {
        mount: (props) => {
          this.field = props;
        },
        unMount: ({ name }) => {
          delete this.values[name];
          delete this.fields[name];
          this.setState({
            values: this.values,
            fields: this.fields,
          });
        },
        update: (eventOrProps) => {
          this.field = eventOrProps;
        },
        blur: (eventOrProps) => {
          const { validateOnBlur } = this.state;
          this.field.update(eventOrProps);
          if (validateOnBlur) {
            let name;
            if (isEvent(eventOrProps)) {
              name = eventOrProps.target.name;
            } else {
              name = eventOrProps.name;
            }
            const errors = {
              ...Deserialize(this.validate().errors, this.names),
              ...this.field.validate(eventOrProps),
            };

            this.errors = {
              ...this.errors,
              [name]: errors[name],
            };

            this.update.errors({
              [name]: errors[name],
            });
          }
        },
        validate: (eventOrProps) => {
          const validate = ({ name, required, value }, itEvent = false) => {
            let { values, fields } = this.data;

            values = {
              ...values,
              [name]: value,
            };

            fields = {
              ...fields,
              [name]: {
                ...fields[name],
                value,
              },
            };

            const validation = {
              errors: {},
              ...this.subscriptions.validate({
                values,
                fields,
                serialized: {
                  values: Serialize(values),
                  fields: Serialize(fields),
                },
              }),
            };

            const errors = Deserialize(validation.errors, this.names);
            if (errors[name]) {
              return {
                [name]: errors[name],
              };
            }

            const error = this.errors[name];
            if (required && !value) {
              return {
                [name]: this.requiredMessage,
              };
            }
            return {
              [name]: (itEvent ? error : errors[name]) || null,
            };
          };

          if (isEvent(eventOrProps)) {
            return validate(eventOrProps.target, true);
          }
          return validate(eventOrProps);
        },
      };
    }

    set field(eventOrProps) {
      let fieldProps;

      const getValue = ({ type, value, defaultValue, checked }) => {
        if (type === 'radio') {
          return checked ? value : '';
        }
        if (!value && typeof value !== 'boolean') {
          return value || defaultValue || '';
        } else {
          return value;
        }
      };

      if (isEvent(eventOrProps)) {
        fieldProps = (({ type, name, required, disabled, value, defaultValue, checked }) => ({
          name, required, disabled,
          value: getValue({type, value, defaultValue: '', checked}),
        }))(eventOrProps.target);
      } else {
        fieldProps = (({ type, name, value, defaultValue, checked }) => ({
          ...this.fields[name] || {},
          ...eventOrProps,
          value: getValue({type, value, defaultValue, checked}),
        }))(eventOrProps);
      }

      const { name, value } = fieldProps;
      this.names = unique(this.names.concat(name));
      this.fields = {
        ...this.fields,
        [name]: fieldProps,
      };
      this.values = {
        ...this.values,
        [name]: value,
      };

      if (isEvent(eventOrProps)) {
        this.errors[name] = this.field.validate(eventOrProps)[name];
      } else {
        this.errors[name] = this.field.validate(fieldProps)[name];
      }

      this.setState({
        names: this.names,
        fields: this.fields,
        values: this.values,
        errors: this.errors,
      });
    }

    validate(data = this.data) {
      const { fields, values } = data;

      const { warnings, errors } = {
        warnings: {},
        errors: {},
        ...this.subscriptions.validate({
          values,
          fields,
          serialized: {
            values: Serialize(values),
            fields: Serialize(fields),
          },
        }),
      };
      return {
        warnings,
        errors: {
          ...Object.keys(values).reduce((o, key) => {
            const value = values[key];
            const field = fields[key];
            if (field) {
              const { name, required } = fields[key];
              if (required && !value) {
                return { ...o, [name]: this.requiredMessage };
              }
              return { ...o, [name]: null };
            }
            return o;
          }, {}),
          ...Deserialize(errors, this.names),
        },
      };
    }

    get update() {
      return {
        value: (name, value) => {
          this.values[name] = value;
          this.fields[name].value = value;
        },
        values: (values, state = {}) => {
          const newValues = Deserialize(values, this.names);
          console.log(newValues);
          this.values = {
            ...Deserialize(this.values, this.names),
            ...newValues,
          };
          console.log(this.values);

          Object.keys(newValues).forEach((name) => {
            const value = this.values[name];
            this.fields[name] = {
              ...this.fields[name],
              value,
            };
            if (typeof value !== 'boolean' && !!value) {
              this.fields[name].error = this.field.validate(this.fields[name])[name];
            }
          });

          const names = Object.keys(newValues);
            // .filter(name => newValues[name] !== '')
            // .map(name => name);

          this.errors = {
            ...this.errors,
            ...Deserialize(this.validate({
              values: this.values,
              fields: this.fields,
            }).errors, names),
          };
          this.setState({
            values: this.values,
            fields: this.fields,
            errors: this.errors,
            ...state,
          });
        },
        errors: (errors) => {
          const { fields } = this;
          const deserialized = Deserialize(errors, this.names);
          Object.keys(deserialized).forEach((name) => {
            if (fields[name]) {
              fields[name].error = deserialized[name];
            }
          });

          this.fields = fields;
          this.errors = {
            ...this.errors,
            ...Deserialize(errors, this.names),
          };
          this.setState({
            errors: this.errors,
            fields,
          });
        },
        warnings: (warnings) => {
          const { fields } = this;
          const deserialized = Deserialize(warnings, this.names);
          Object.keys(deserialized).forEach((name) => {
            if (fields[name]) {
              fields[name].warning = deserialized[name];
            }
          });

          this.fields = fields;
          this.warnings = {
            ...this.warnings,
            ...Deserialize(warnings, this.names),
          };
          this.setState({
            warnings: this.warnings,
            fields,
          });
        },
      };
    }

    submit() { this.subscriptions.submit(); }

    reset() {
      const { fields } = this;
      const values = {};
      let value;
      Object.keys(fields).forEach(name => {
        value = fields[name].defaultValue;
        if (typeof value !== 'boolean' && !value) {
          value = null;
        }
        values[name] = value;
      });
      this.update.values(values, { isSubmitted: false });
    }

    handleSubmit(e) {
      e.persist();
      const { names, values, fields } = this.data;
      const { warnings, errors } = this.validate();

      this.names = unique(this.names.concat(names));
      this.values = values;
      this.fields = fields;
      this.errors = errors;
      this.warnings = warnings;

      const deserialized = Deserialize(errors, this.names);
      Object.keys(deserialized).forEach((name) => {
        if (this.fields[name]) {
          this.fields[name].error = deserialized[name];
        }
      });

      this.setState({
        names: this.names,
        values: this.values,
        fields: this.fields,
        errors: this.errors,
        warnings: this.warnings,
        isSubmitted: true,
      });

      this.subscriptions.handleSubmit(e, {
        serialized: {
          values: Serialize(values),
          errors: Serialize(errors),
        },
        values,
        errors,

        fields,
      });
      return false;
    }

    subscribe(name, callback) {
      this.subscriptions[name] = callback;
    }

    unSubscribe(name) {
      this.subscriptions[name] = undefined;
    }

    get isValid() {
      const { values, fields, errors } = this.state;
      return Object.keys(values).reduce((isValid, name) => {
        const field = fields[name];
        if (
          (field && errors[name])
          &&
          (
            typeof field.required !== 'undefined'
            &&
            field.required === true
          )
        ) {
          return false;
        }
        return isValid;
      }, true);
    }

    get serialized() {
      const { values, errors, warnings } = this.state;
      return {
        values: Serialize(values),
        errors: Serialize(errors),
        warnings: Serialize(warnings),
      };
    }

    render() {
      return (
        <Composed
          {...this.state}
          {...this.props}
          isValid={this.isValid}
          serialized={this.serialized}
          handleChange={this.field.update}
          handleBlur={this.field.blur}
          update={this.update}
          reset={this.reset}
        />
      );
    }

  }

  return props => (
    <Connect {...props} />
  );
};

export default () => target => connect(target);
