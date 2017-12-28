import get from 'lodash.get';

export default function Deserialize(source, names) {
  return names.reduce((data, name) => {
    const value = get(source, name);
    if (value !== undefined) {
      return {
        ...data,
        [name]: value,
      };
    }
    return data;
  }, {});
}
