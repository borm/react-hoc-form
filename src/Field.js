import React, {
  Component,
  cloneElement,
  createElement,
  isValidElement,
} from 'react';
import PropTypes from 'prop-types';
import isEvent from './helpers/isEvent';

class Field extends Component {

  static contextTypes = {
    update: PropTypes.object,
    field: PropTypes.object,
    handleChange: PropTypes.func,
    handleBlur: PropTypes.func,
    values: PropTypes.object,
    errors: PropTypes.object,
    warnings: PropTypes.object,
  };
  static propTypes = {
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    component: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.node,
      PropTypes.element,
      PropTypes.func,
    ]),
    value: PropTypes.any,
    checked: PropTypes.any,
    defaultValue: PropTypes.any,
    defaultChecked: PropTypes.any,
    error: PropTypes.any,
    onChange: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.func,
    ]),
  };
  static defaultProps = {
    type: 'text',
    component: 'input',
    defaultValue: '',
    value: undefined,
    defaultChecked: undefined,
    checked: undefined,
    error: undefined,
    onChange: false,
  };

  constructor(props) {
    super(props);

    const {
      type,
      defaultValue, value,
      defaultChecked, checked,
    } = props;
    let initialValue;
    if (typeof defaultValue !== 'undefined') {
      initialValue = defaultValue;
    }
    if (typeof value !== 'undefined') {
      initialValue = value;
    }
    if (type === 'checkbox') {
      if (typeof defaultChecked !== 'undefined') { initialValue = defaultChecked; }
      if (typeof checked !== 'undefined') { initialValue = checked; }
    }
    this.state = {
      error: props.error,
      value: initialValue,
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    this.context.field.mount(this.props);
  }

  componentWillReceiveProps(props, context) {
    const { name } = props;
    const value = context.values[name];
    if (this.state.value !== value) {
      this.setState({ value });
    }
  }

  componentWillUnmount() {
    this.context.field.unMount(this.props);
  }

  // shouldComponentUpdate(props) {
  //   if (this.props.name === 'shipping[field_cap_postal_code_locality]') {
  //     debugger;
  //   }
  //   return isEqual(this.props, props);
  // }

  onChange(eventOrValue) {
    let value;
    if (isEvent(eventOrValue)) {
      const { target } = eventOrValue;
      if (target.type === 'checkbox') {
        value = target.checked;
      } else {
        value = target.value;
      }
    } else {
      value = eventOrValue;
    }
    // console.error('handleChange', value);
    const props = { ...this.props, value };
    const { name } = props;
    const error = this.context.field.validate(props)[name];

    const state = { value };
    if (error !== this.state.error || error !== this.context.errors[name]) {
      state.error = error;
      this.context.update.errors({ [name]: error });
    }
    // console.log('core Field setState');
    this.setState(state);
    // console.log('core Field update.value');
    this.context.update.value(name, value);

    const { warnings } = this.context;
    if (warnings[name]) {
      this.context.update.warnings({ [name]: undefined });
    }
  }

  handleChange(eventOrValue) {
    let value;
    if (isEvent(eventOrValue)) {
      const { target } = eventOrValue;
      if (target.type === 'checkbox') {
        value = target.checked;
      } else {
        value = target.value;
      }
    } else {
      value = eventOrValue;
    }
    // console.error('handleChange', value);
    this.setState({ value });
    const props = { ...this.props, value };
    this.context.handleBlur(props);
  }

  handleBlur(eventOrValue) {
    if (isEvent(eventOrValue)) {
      this.context.handleBlur(eventOrValue);
    } else {
      const props = { ...this.props, value: eventOrValue };
      this.context.handleBlur(props);
    }
  }

  get value() {
    const { type, name } = this.props;
    const value = this.state.value || this.context.values[name] || this.props.value;
    if (type === 'checkbox') {
      return !!value;
    }
    return value;
  }

  render() {
    const {
      type, name, component,
      defaultValue, defaultChecked,
      ...other
    } = this.props;
    const { value } = this.props;
    const props = {
      name,
      type,
      onChange: this.onChange,
      handleChange: this.handleChange,
      handleBlur: this.handleBlur,
      field: {
        ...other,
        name,
        type,
        value: type === 'radio' ? value : this.value,
      },
    };

    if (type === 'checkbox') {
      props.field.checked = this.value;
    }
    if (type === 'radio') {
      const toString = val => typeof val !== 'undefined' ? val.toString() : val;
      props.field.checked = toString(value) === toString(this.context.values[name]);
    }
    if (type === 'checkbox' || type === 'radio') {
      props.field.onChange = this.handleChange;
    }

    const { errors, warnings } = this.context;
    if (errors && errors[name]) {
      props.error = errors[name];
    }
    props.warning = warnings[name];

    return isValidElement(component)
      ? cloneElement(component, props)
      : createElement(component, props);
  }
}

export default Field;
