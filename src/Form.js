/* eslint-disable react/sort-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import scrollIntoView from 'scroll-into-view';
import isPromise from './isPromise';
import Deserialize from './Deserialize';

class Form extends Component {

  static contextTypes = {
    initialize: PropTypes.func,

    subscribe: PropTypes.func,
    unSubscribe: PropTypes.func,
    handleSubmit: PropTypes.func,

    names: PropTypes.array,
  };
  static propTypes = {
    validateOnBlur: PropTypes.bool,
    noValidate: PropTypes.bool,
    children: PropTypes.any,

    onSubmit: PropTypes.func,
    validate: PropTypes.func,

    names: PropTypes.array,
    values: PropTypes.object,
    fields: PropTypes.object,
    errors: PropTypes.object,
  };
  static defaultProps = {
    validateOnBlur: true,
    noValidate: true,
    children: null,

    onSubmit: () => {},
    validate: () => {},

    names: [],
    values: {},
    fields: {},
    errors: {},
  };

  static getCoords(elem) {
    // (1)
    let box = elem.getBoundingClientRect();

    let body = document.body;
    let docEl = document.documentElement;

    // (2)
    let scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    let scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    // (3)
    let clientTop = docEl.clientTop || body.clientTop || 0;
    let clientLeft = docEl.clientLeft || body.clientLeft || 0;

    // (4)
    let top = box.top + scrollTop - clientTop;
    let left = box.left + scrollLeft - clientLeft;

    return {
      top: top,
      left: left
    };
  }

  constructor(props) {
    super(props);
    this.subscribe = this.subscribe.bind(this);
    this.unSubscribe = this.unSubscribe.bind(this);

    this.submit = this.submit.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onSubmitFail = this.onSubmitFail.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentWillMount() {
    this.subscribe();
  }

  componentDidMount() {
    this.context.initialize({
      validateOnBlur: this.props.validateOnBlur,
      form: this.form,
      names: this.props.names,
      values: this.props.values,
      fields: this.props.fields,
      errors: this.props.errors,
    });
  }

  componentWillReceiveProps() {
    this.unSubscribe();
    this.subscribe();
  }

  componentWillUnmount() {
    this.unSubscribe();
  }

  subscribe() {
    this.context.subscribe('submit', this.submit);
    this.context.subscribe('handleSubmit', this.handleSubmit);
    this.context.subscribe('validate', this.props.validate);
  }

  unSubscribe() {
    this.context.unSubscribe('submit');
    this.context.unSubscribe('validate');
    this.context.unSubscribe('handleSubmit');
  }

  submit() {
    const { form } = this;
    const input = form.ownerDocument.createElement('input');
    input.style.display = 'none';
    input.type = 'submit';
    form.appendChild(input).click();
    form.removeChild(input);
  }

  onSubmit(e) {
    e.preventDefault();
    this.context.handleSubmit(e);
    return false;
  }

  onSubmitFail(errors) {
    const errKeys = Object.keys(errors).filter(key => !!errors[key]);
    console.log({errors, errKeys});
    let errorFieldKey;
    const $field = name => document.getElementsByName(name)[0];
    if (errKeys.length) {
      // Scroll to first error
      let prev;
      let next;
      const offsetTop = element => element ? Form.getCoords(element).top : 0;
      errorFieldKey = errKeys.reduce((prevKey, nextKey) => {
        prev = $field(prevKey);
        next = $field(nextKey);
        return offsetTop(prev) < offsetTop(next) ? prevKey : nextKey;
      });
    }
    if (typeof errorFieldKey !== 'undefined') {
      scrollIntoView($field(errorFieldKey));
      return false;
    }
    return true;
  }

  handleSubmit(e, { serialized, values, errors }) {
    if (!this.onSubmitFail(errors)) {
      return false;
    }
    const result = this.props.onSubmit(e, { serialized, values, errors });
    if (isPromise(result)) {
      result.catch((response) => {
        this.onSubmitFail(Deserialize(response, this.context.names));
      });
    }
  }

  get children() {
    return this.props.children;
  }

  render() {
    const {
      names, values, fields, errors, warnings, validate, validateOnBlur,
      ...other,
    } = this.props;
    return (
      <form
        {...other}
        ref={form => (this.form = form)}
        onSubmit={this.onSubmit}
        noValidate={this.props.noValidate}
      >
        { this.children }
      </form>
    );
  }

}

export default Form;
