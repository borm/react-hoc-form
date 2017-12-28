import keys from 'lodash.keys';
import set from 'lodash.set';
import trim from 'lodash.trim';
import toBoolean from './helpers/toBoolean';

export default function Serialize(values) {
  const data = {};
  keys(values).forEach((key) => {
    const inputName = trim(key);
    let inputValue = values[key];

    if (inputValue === 'true' || inputValue === 'false') {
      inputValue = toBoolean(inputValue);
    }

    set(data, inputName, inputValue);
  });

  return data;
}
