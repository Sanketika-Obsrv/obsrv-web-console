import { flattenObject, unflattenObject } from './json-schema';

describe('unflattenObject', () => {
    it('nests dotted keys', () => {
        expect(unflattenObject({ student_id: 'STU-1', 'school.name': 'A', 'school.address.city': 'B' })).toEqual({
            student_id: 'STU-1',
            school: { name: 'A', address: { city: 'B' } }
        });
    });

    it('lets a joined object replace a same-named scalar, whatever the key order', () => {
        const expected = { student: { grade: 7, gender: 'M' } };
        expect(unflattenObject({ student: 'STU-1', 'student.grade': 7, 'student.gender': 'M' })).toEqual(expected);
        expect(unflattenObject({ 'student.grade': 7, 'student.gender': 'M', student: 'STU-1' })).toEqual(expected);
    });

    it('keeps arrays and empty input as-is', () => {
        expect(unflattenObject({ 'school.tags': ['a', 'b'] })).toEqual({ school: { tags: ['a', 'b'] } });
        expect(unflattenObject({})).toEqual({});
    });

    it('reverses flattenObject', () => {
        const event = { id: 1, school: { name: 'A', address: { city: 'B' } }, tags: ['x'] };
        expect(unflattenObject(flattenObject(event))).toEqual(event);
    });
});
