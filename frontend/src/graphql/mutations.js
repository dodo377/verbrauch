import { gql } from 'urql';

// Entspricht exakt unserem Backend-Schema!
export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        id
        username
      }
    }
  }
`;
export const ADD_READING = gql`
  mutation AddReading($type: ReadingType!, $value: Float!, $note: String) {
    addReading(type: $type, value: $value, note: $note) {
      id
      type
      value
      timestamp
      note
    }
  }
`;

export const UPDATE_READING_NOTE = gql`
  mutation UpdateReadingNote($id: ID!, $note: String!) {
    updateReadingNote(id: $id, note: $note) {
      id
      note
    }
  }
`;